"""
anomaly_detection.py - WeatherTrust Temporal Analysis, Isolation Forest & Evidence Classification

Implements:
1. Temporal rate-of-change and isolated spike detection with recovery verification.
2. Robust rolling window statistics (rolling median, rolling MAD, robust z-score).
3. Multivariate Isolation Forest anomaly scoring (reproducible, random_state=42).
4. Multi-evidence fusion into 4 discrete classifications:
   - NORMAL
   - PROBABLE_SENSOR_FAULT
   - POSSIBLE_WEATHER_EXTREME
   - UNCERTAIN
5. Deterministic confidence scoring and structured plain-English explanations.
"""

from typing import Dict, List, Any, Tuple, Optional
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

from .config import (
    TEMPORAL_CONFIG,
    ISOLATION_FOREST_CONFIG,
    PRIMARY_MONITORED_SENSORS,
    TEMP_SENSORS,
    RH_SENSORS,
)


def compute_temporal_evidence(
    df: pd.DataFrame
) -> Dict[str, Dict[int, Dict[str, Any]]]:
    """
    Computes per-sensor temporal evidence:
    - previous value (t-1)
    - next value (t+1)
    - step change (delta_prev = x_t - x_{t-1})
    - step return (delta_next = x_{t+1} - x_t)
    - rolling median & rolling MAD
    - isolated spike detection (large jump with immediate recovery)

    Returns:
        temporal_evidence: Dict[sensor_name -> Dict[row_idx -> evidence_dict]]
    """
    temporal_evidence: Dict[str, Dict[int, Dict[str, Any]]] = {
        s: {} for s in PRIMARY_MONITORED_SENSORS if s in df.columns
    }

    n_rows = len(df)
    t_cfg = TEMPORAL_CONFIG
    window_size = t_cfg["rolling_window_steps"]

    for sensor in temporal_evidence.keys():
        series = df[sensor]
        values = series.values

        # Rolling median & robust MAD
        rolling_med = series.rolling(window=window_size, min_periods=3, center=True).median().values
        abs_dev = np.abs(values - rolling_med)
        rolling_mad = pd.Series(abs_dev).rolling(window=window_size, min_periods=3, center=True).median().values * 1.4826

        # Determine threshold parameters based on sensor family
        is_temp = sensor in TEMP_SENSORS
        is_press = sensor == "pressure"
        is_rh = sensor in RH_SENSORS

        if is_temp:
            rate_limit = t_cfg["temp_rate_of_change_max"]
            spike_jump = t_cfg["temp_spike_jump"]
            rebound_tol = t_cfg["temp_spike_rebound_tolerance"]
        elif is_press:
            rate_limit = t_cfg["pressure_rate_of_change_max"]
            spike_jump = t_cfg["pressure_spike_jump"]
            rebound_tol = 10.0
        elif is_rh:
            rate_limit = t_cfg["rh_rate_of_change_max"]
            spike_jump = t_cfg["rh_spike_jump"]
            rebound_tol = t_cfg["rh_spike_rebound_tolerance"]
        else:
            rate_limit = 20.0
            spike_jump = 30.0
            rebound_tol = 10.0

        for i in range(n_rows):
            v_curr = values[i]
            if np.isnan(v_curr):
                continue

            # Prior observation check (ensure within valid time delta)
            v_prev = values[i - 1] if i > 0 else np.nan
            gap_prev = df["is_timestamp_gap"].iloc[i] if i > 0 else True
            valid_prev = (not gap_prev) and (not np.isnan(v_prev))

            # Subsequent observation check
            v_next = values[i + 1] if i < n_rows - 1 else np.nan
            gap_next = df["is_timestamp_gap"].iloc[i + 1] if i < n_rows - 1 else True
            valid_next = (not gap_next) and (not np.isnan(v_next))

            delta_prev = (v_curr - v_prev) if valid_prev else 0.0
            delta_next = (v_next - v_curr) if valid_next else 0.0

            med = rolling_med[i]
            mad = rolling_mad[i] if not np.isnan(rolling_mad[i]) and rolling_mad[i] > 1e-4 else 1.0
            dev_from_med = abs(v_curr - med) if not np.isnan(med) else 0.0
            robust_z = dev_from_med / mad

            # Check for isolated transient spike:
            # 1. Step change |delta_prev| exceeds spike_jump threshold
            # 2. Rebound occurs in opposite direction (delta_prev * delta_next < 0)
            # 3. Subsequent reading returns close to pre-spike baseline (|v_next - v_prev| <= rebound_tol)
            is_spike = False
            if valid_prev and valid_next:
                if abs(delta_prev) >= spike_jump and (delta_prev * delta_next < 0):
                    baseline_diff = abs(v_next - v_prev)
                    if baseline_diff <= rebound_tol:
                        is_spike = True

            # Check for rapid rate violation without rebound (e.g. sustained jump)
            rate_violation = valid_prev and (abs(delta_prev) >= rate_limit)

            if is_spike:
                temporal_evidence[sensor][i] = {
                    "flag": "TEMPORAL_ISOLATED_SPIKE",
                    "severity": "SEVERE",
                    "value": float(v_curr),
                    "prev_value": float(v_prev),
                    "next_value": float(v_next),
                    "delta_prev": round(float(delta_prev), 2),
                    "delta_next": round(float(delta_next), 2),
                    "baseline_diff": round(float(abs(v_next - v_prev)), 2),
                    "rolling_median": round(float(med), 2) if not np.isnan(med) else None,
                    "robust_z": round(float(robust_z), 2),
                    "details": (
                        f"Sensor '{sensor}' registered an isolated transient spike of {v_curr:.2f} "
                        f"(jump of {delta_prev:+.1f} from {v_prev:.2f}) with immediate recovery to {v_next:.2f} "
                        f"(rebound {delta_next:+.1f}, baseline diff {abs(v_next - v_prev):.1f})."
                    ),
                }
            elif rate_violation:
                temporal_evidence[sensor][i] = {
                    "flag": "TEMPORAL_RATE_EXCEEDED",
                    "severity": "WARNING",
                    "value": float(v_curr),
                    "prev_value": float(v_prev),
                    "delta_prev": round(float(delta_prev), 2),
                    "rolling_median": round(float(med), 2) if not np.isnan(med) else None,
                    "robust_z": round(float(robust_z), 2),
                    "details": (
                        f"Sensor '{sensor}' changed by {delta_prev:+.1f} in 30 min (from {v_prev:.2f} to {v_curr:.2f}), "
                        f"exceeding standard rate threshold ({rate_limit:.1f})."
                    ),
                }

    return temporal_evidence


def run_isolation_forest(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Fits and scores an Isolation Forest model as an unsupervised multivariate anomaly signal.

    Returns:
        anomaly_scores: Array of normalized anomaly scores in [0.0, 1.0] (higher = more anomalous)
        is_outlier: Boolean array indicating IF model outlier decision (flagged by contamination threshold)
        if_metadata: Dictionary of model settings and summary stats
    """
    cfg = ISOLATION_FOREST_CONFIG
    feature_matrix = pd.DataFrame(index=df.index)

    # 1. Base measurement columns
    for col in cfg["feature_columns"]:
        if col in df.columns:
            feature_matrix[col] = df[col]

    # 2. Multi-height difference features
    for c1, c2 in cfg["diff_features"]:
        if c1 in df.columns and c2 in df.columns:
            feature_matrix[f"diff_{c1}_{c2}"] = df[c1] - df[c2]

    # 3. Temporal difference features
    for c in cfg["rate_features"]:
        if c in df.columns:
            feature_matrix[f"rate_{c}"] = df[c].diff()

    # Impute missing values with column medians for scikit-learn
    feature_matrix_imputed = feature_matrix.copy()
    for col in feature_matrix_imputed.columns:
        med = feature_matrix_imputed[col].median()
        if pd.isna(med):
            med = 0.0
        feature_matrix_imputed[col] = feature_matrix_imputed[col].fillna(med)

    model = IsolationForest(
        n_estimators=cfg["n_estimators"],
        contamination=cfg["contamination"],
        random_state=cfg["random_state"],
        n_jobs=-1,
    )

    model.fit(feature_matrix_imputed)

    # raw decision function: negative values indicate outliers
    raw_scores = model.decision_function(feature_matrix_imputed)
    preds = model.predict(feature_matrix_imputed)  # -1 = outlier, 1 = inlier

    # Normalize score into [0.0, 1.0] where 1.0 is extreme outlier
    min_score = raw_scores.min()
    max_score = raw_scores.max()
    score_range = max_score - min_score if max_score > min_score else 1.0
    normalized_anomaly_scores = 1.0 - ((raw_scores - min_score) / score_range)

    is_outlier = (preds == -1)

    metadata = {
        "n_estimators": cfg["n_estimators"],
        "contamination": cfg["contamination"],
        "random_state": cfg["random_state"],
        "feature_count": feature_matrix_imputed.shape[1],
        "feature_names": list(feature_matrix_imputed.columns),
        "total_outliers": int(np.sum(is_outlier)),
        "outlier_percentage": round(float(np.mean(is_outlier) * 100), 2),
        "min_normalized_score": round(float(normalized_anomaly_scores.min()), 4),
        "max_normalized_score": round(float(normalized_anomaly_scores.max()), 4),
    }

    return normalized_anomaly_scores, is_outlier, metadata


def classify_sensor_observation(
    sensor: str,
    row_idx: int,
    raw_val: Any,
    float_val: Optional[float],
    rule_evidence: Optional[Dict[str, Any]],
    cross_evidence: Optional[Dict[str, Any]],
    temporal_ev: Optional[Dict[str, Any]],
    battery_ev: Optional[Dict[str, Any]],
    frozen_ev: Optional[Dict[str, Any]],
    if_score: float,
    if_outlier: bool,
    timestamp_str: str,
) -> Dict[str, Any]:
    """
    Integrates all independent evidence streams into one of 4 discrete classifications:
    - NORMAL
    - PROBABLE_SENSOR_FAULT
    - POSSIBLE_WEATHER_EXTREME
    - UNCERTAIN

    Computes deterministic confidence score and natural-language explanation.
    """
    fault_signals: List[str] = []
    warning_signals: List[str] = []
    support_signals: List[str] = []

    # 1. Rule & Sentinel Evidence
    if rule_evidence:
        flag = rule_evidence.get("flag")
        if flag == "HARDWARE_SENTINEL_FAULT":
            fault_signals.append(f"Hardware Sentinel: {rule_evidence.get('details')}")
        elif flag in ["PHYSICAL_LOWER_BOUND_VIOLATION", "PHYSICAL_UPPER_BOUND_VIOLATION", "WIND_DIR_OUT_OF_BOUNDS"]:
            fault_signals.append(f"Physical Bound: {rule_evidence.get('details')}")

    # 2. Colocated Cross-Sensor Evidence
    if cross_evidence:
        flag = cross_evidence.get("flag")
        if flag == "CROSS_SENSOR_SEVERE_DISAGREEMENT":
            fault_signals.append(f"Cross-Sensor Consensus Conflict: {cross_evidence.get('details')}")
        elif flag in ["CROSS_SENSOR_MODERATE_DISAGREEMENT", "CROSS_SENSOR_PAIRWISE_DIVERGENCE"]:
            warning_signals.append(f"Cross-Sensor Divergence: {cross_evidence.get('details')}")

    # 3. Temporal Rate & Isolated Spike Evidence
    if temporal_ev:
        flag = temporal_ev.get("flag")
        if flag == "TEMPORAL_ISOLATED_SPIKE":
            fault_signals.append(f"Temporal Isolated Spike: {temporal_ev.get('details')}")
        elif flag == "TEMPORAL_RATE_EXCEEDED":
            warning_signals.append(f"Temporal Rate: {temporal_ev.get('details')}")

    # 4. Battery / Power Evidence
    if battery_ev:
        b_flag = battery_ev.get("flag")
        if b_flag == "BATTERY_POWER_FAILURE":
            fault_signals.append(f"Power Dropout: {battery_ev.get('details')}")
        elif b_flag == "BATTERY_UNDERVOLTAGE":
            warning_signals.append(f"Low Power: {battery_ev.get('details')}")

    # 5. Frozen Sensor Evidence
    if frozen_ev:
        fault_signals.append(f"Frozen Sensor: {frozen_ev.get('details')}")

    # 6. Isolation Forest Evidence
    if if_outlier:
        if if_score >= 0.70:
            fault_signals.append(f"Isolation Forest Multivariate Outlier (score={if_score:.3f})")
        else:
            warning_signals.append(f"Isolation Forest Warning (score={if_score:.3f})")

    # Classification Decision Logic
    classification = "NORMAL"
    confidence = 0.95
    explanation = f"Sensor '{sensor}' reading is within normal physical bounds and consistent with colocated sensors."

    # PROBABLE SENSOR FAULT requires multiple agreeing fault signals OR an impossible hardware sentinel
    is_sentinel = any("Hardware Sentinel" in s or "Physical Bound" in s for s in fault_signals)
    severe_cross = any("Cross-Sensor Consensus Conflict" in s for s in fault_signals)
    temporal_spike = any("Temporal Isolated Spike" in s for s in fault_signals)
    power_failure = any("Power Dropout" in s for s in fault_signals)

    if is_sentinel:
        classification = "PROBABLE_SENSOR_FAULT"
        confidence = 0.99
        explanation = f"Sensor '{sensor}' reported an invalid or impossible hardware sentinel value. Direct evidence: {'; '.join(fault_signals)}."

    elif severe_cross and temporal_spike:
        classification = "PROBABLE_SENSOR_FAULT"
        confidence = 0.98
        explanation = (
            f"Sensor '{sensor}' experienced a severe isolated glitch. It violently disagreed with colocated sensors "
            f"and immediately returned to baseline, confirming a transient sensor fault rather than weather."
        )

    elif severe_cross and power_failure:
        classification = "PROBABLE_SENSOR_FAULT"
        confidence = 0.97
        explanation = f"Sensor '{sensor}' failed during an active power failure / dead battery event. Evidence: {'; '.join(fault_signals)}."

    elif len(fault_signals) >= 2:
        classification = "PROBABLE_SENSOR_FAULT"
        confidence = min(0.99, 0.85 + 0.05 * len(fault_signals))
        explanation = f"Multiple independent fault signals confirm probable sensor malfunction: {'; '.join(fault_signals)}."

    elif frozen_ev:
        classification = "PROBABLE_SENSOR_FAULT"
        confidence = 0.90
        explanation = f"Sensor '{sensor}' is frozen at a static value without natural diurnal fluctuation: {frozen_ev.get('details')}."

    elif len(fault_signals) == 1 and not is_sentinel:
        # Single isolated fault signal without cross-sensor confirmation:
        # Check if this might be POSSIBLE_WEATHER_EXTREME
        if float_val is not None:
            # Climatological extreme temperature (e.g. > 44°C or < 8°C) but colocated sensors agree
            if sensor in TEMP_SENSORS and (float_val >= 43.0 or float_val <= 8.0) and not severe_cross and not temporal_spike:
                classification = "POSSIBLE_WEATHER_EXTREME"
                confidence = 0.88
                explanation = (
                    f"Observation ({float_val:.2f}°C) is climatologically extreme, but colocated multi-height temperature "
                    f"sensors remain mutually consistent without temporal spikes, confirming genuine atmospheric weather."
                )
            else:
                classification = "UNCERTAIN"
                confidence = 0.65
                explanation = f"Sensor '{sensor}' raised an isolated warning without corroboration: {fault_signals[0]}."

    elif len(warning_signals) >= 2:
        classification = "UNCERTAIN"
        confidence = 0.70
        explanation = f"Observation exhibits moderate divergence across multiple metrics: {'; '.join(warning_signals)}."

    elif len(warning_signals) == 1:
        classification = "UNCERTAIN"
        confidence = 0.60
        explanation = f"Minor warning detected: {warning_signals[0]}."

    else:
        # Check for extreme weather that passes all checks
        if float_val is not None and sensor in TEMP_SENSORS and float_val >= 44.0:
            classification = "POSSIBLE_WEATHER_EXTREME"
            confidence = 0.90
            explanation = (
                f"High temperature observation ({float_val:.2f}°C) verified as genuine extreme heat wave: "
                f"colocated sensors agree and temporal change is physically continuous."
            )

    return {
        "timestamp": timestamp_str,
        "row_idx": row_idx,
        "sensor": sensor,
        "raw_value": str(raw_val),
        "numeric_value": float_val,
        "classification": classification,
        "confidence": round(float(confidence), 2),
        "if_score": round(float(if_score), 4),
        "if_outlier": bool(if_outlier),
        "rule_flags": [rule_evidence["flag"]] if rule_evidence else [],
        "cross_sensor_evidence": cross_evidence,
        "temporal_evidence": temporal_ev,
        "power_evidence": battery_ev,
        "fault_signals": fault_signals,
        "warning_signals": warning_signals,
        "explanation": explanation,
    }
