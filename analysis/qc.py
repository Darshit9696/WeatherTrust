"""
qc.py - WeatherTrust Rule-Based Quality Control & Colocated Sensor Consensus

Implements rule-based checks:
1. Missing value detection
2. Physical bounds & hardware sentinel checks
3. Power/battery diagnostic evidence
4. Frozen/stuck sensor detection
5. Colocated multi-height cross-sensor consensus (2m, 4m, 8m)

Every rule produces a named flag and structured diagnostic evidence.
"""

from typing import Dict, List, Any, Optional, Tuple
import numpy as np
import pandas as pd

from .config import (
    PHYSICAL_LIMITS,
    HARDWARE_SENTINELS,
    CROSS_SENSOR_CONFIG,
    STUCK_SENSOR_CONFIG,
    BATTERY_CONFIG,
    PRIMARY_MONITORED_SENSORS,
    TEMP_SENSORS,
    RH_SENSORS,
    WIND_SPEED_SENSORS,
)


def evaluate_physical_and_sentinel_rules(
    df: pd.DataFrame,
    raw_df: pd.DataFrame
) -> Dict[str, Dict[int, Dict[str, Any]]]:
    """
    Evaluates physical domain bounds and known hardware sentinel values per sensor.
    Returns:
        sensor_flags: Dict[sensor_name -> Dict[row_idx -> {flags: List[str], details: str, severity: str}]]
    """
    sensor_flags: Dict[str, Dict[int, Dict[str, Any]]] = {
        col: {} for col in PRIMARY_MONITORED_SENSORS if col in df.columns
    }

    n_rows = len(df)

    for sensor in sensor_flags.keys():
        series = df[sensor]
        raw_series = raw_df[sensor] if sensor in raw_df.columns else None

        # 1. Missing Value Check
        missing_mask = series.isna()
        for idx in np.where(missing_mask)[0]:
            sensor_flags[sensor][idx] = {
                "flag": "MISSING_VALUE",
                "severity": "INFO",
                "details": f"Sensor '{sensor}' has missing/null value.",
                "raw_val": "NA" if raw_series is None else str(raw_series.iloc[idx]),
            }

        # 2. Hardware Sentinel Values Check
        if sensor in HARDWARE_SENTINELS:
            sentinels = HARDWARE_SENTINELS[sensor]
            for sentinel_val in sentinels:
                sentinel_mask = np.isclose(series.values, sentinel_val, equal_nan=False)
                for idx in np.where(sentinel_mask)[0]:
                    sensor_flags[sensor][idx] = {
                        "flag": "HARDWARE_SENTINEL_FAULT",
                        "severity": "SEVERE",
                        "details": f"Sensor '{sensor}' reported hardware sentinel value {sentinel_val}, indicating sensor failure or unread ADC bus.",
                        "raw_val": str(series.iloc[idx]),
                    }

        # 3. Physical Plausible Limits Check
        if sensor in PHYSICAL_LIMITS:
            low_bound, high_bound = PHYSICAL_LIMITS[sensor]
            
            # Check below physical minimum
            low_violation = (series < low_bound) & (~series.isna())
            for idx in np.where(low_violation)[0]:
                val = series.iloc[idx]
                sensor_flags[sensor][idx] = {
                    "flag": "PHYSICAL_LOWER_BOUND_VIOLATION",
                    "severity": "SEVERE",
                    "details": f"Sensor '{sensor}' value {val} is below regional physical minimum {low_bound}.",
                    "raw_val": str(val),
                }

            # Check above physical maximum
            high_violation = (series > high_bound) & (~series.isna())
            for idx in np.where(high_violation)[0]:
                val = series.iloc[idx]
                sensor_flags[sensor][idx] = {
                    "flag": "PHYSICAL_UPPER_BOUND_VIOLATION",
                    "severity": "SEVERE",
                    "details": f"Sensor '{sensor}' value {val} exceeds physical maximum {high_bound}.",
                    "raw_val": str(val),
                }

    # Wind direction domain check (0 - 360 deg)
    for w_dir in ["wind_dir_3m", "wind_dir_6m", "wind_dir_10m"]:
        if w_dir in df.columns:
            if w_dir not in sensor_flags:
                sensor_flags[w_dir] = {}
            w_series = df[w_dir]
            out_of_bounds = (w_series > 360.0) | (w_series < 0.0)
            for idx in np.where(out_of_bounds)[0]:
                val = w_series.iloc[idx]
                sensor_flags[w_dir][idx] = {
                    "flag": "WIND_DIR_OUT_OF_BOUNDS",
                    "severity": "SEVERE",
                    "details": f"Wind direction {w_dir}={val}° violates circular physical domain [0, 360]°.",
                    "raw_val": str(val),
                }

    return sensor_flags


def evaluate_battery_diagnostics(df: pd.DataFrame) -> Dict[int, Dict[str, Any]]:
    """
    Evaluates power supply health and battery diagnostics.
    """
    battery_events: Dict[int, Dict[str, Any]] = {}
    if "battery_voltage" not in df.columns:
        return battery_events

    batt = df["battery_voltage"]
    crit_volt = BATTERY_CONFIG["critical_voltage"]
    fail_volt = BATTERY_CONFIG["power_failure_voltage"]

    for idx, v in enumerate(batt):
        if pd.isna(v):
            continue
        if v <= fail_volt:
            battery_events[idx] = {
                "flag": "BATTERY_POWER_FAILURE",
                "severity": "SEVERE",
                "voltage": float(v),
                "details": f"Battery voltage dropped to {v}V (<= {fail_volt}V), indicating total power blackout.",
            }
        elif v < crit_volt:
            battery_events[idx] = {
                "flag": "BATTERY_UNDERVOLTAGE",
                "severity": "WARNING",
                "voltage": float(v),
                "details": f"Battery voltage is {v}V (< {crit_volt}V), causing potential ADC instability.",
            }
        elif v > BATTERY_CONFIG["overvoltage"]:
            battery_events[idx] = {
                "flag": "BATTERY_OVERVOLTAGE",
                "severity": "WARNING",
                "voltage": float(v),
                "details": f"Battery voltage {v}V exceeds {BATTERY_CONFIG['overvoltage']}V, indicating charge controller failure.",
            }

    return battery_events


def evaluate_frozen_sensors(df: pd.DataFrame) -> Dict[str, Dict[int, Dict[str, Any]]]:
    """
    Detects frozen/stuck sensors where consecutive floating-point values are identical
    over an unrealistically long duration (default 12 steps = 6 hours) on continuous outdoor parameters.
    """
    stuck_flags: Dict[str, Dict[int, Dict[str, Any]]] = {
        col: {} for col in STUCK_SENSOR_CONFIG["applicable_sensors"] if col in df.columns
    }
    min_steps = STUCK_SENSOR_CONFIG["min_consecutive_identical"]
    excluded_vals = STUCK_SENSOR_CONFIG.get("excluded_saturation_values", {})

    for sensor in stuck_flags.keys():
        series = df[sensor].values
        n = len(series)
        run_length = 1
        sensor_excluded = excluded_vals.get(sensor, [])

        for i in range(1, n):
            # Check gap: do not count frozen streak across data gaps
            if df["is_timestamp_gap"].iloc[i]:
                run_length = 1
                continue

            v_prev = series[i - 1]
            v_curr = series[i]

            if not np.isnan(v_prev) and not np.isnan(v_curr) and np.isclose(v_prev, v_curr, atol=1e-5):
                # If value is in excluded saturation values (e.g. 100% RH during rain/fog), do not flag as sensor fault
                if any(np.isclose(v_curr, ex_val, atol=1e-3) for ex_val in sensor_excluded):
                    run_length = 1
                    continue

                run_length += 1
                if run_length >= min_steps:
                    stuck_flags[sensor][i] = {
                        "flag": "FROZEN_SENSOR",
                        "severity": "WARNING",
                        "consecutive_steps": run_length,
                        "frozen_value": float(v_curr),
                        "details": f"Sensor '{sensor}' has been frozen at {v_curr} for {run_length} consecutive intervals ({run_length * 0.5:.1f} hours).",
                    }
            else:
                run_length = 1

    return stuck_flags


def evaluate_colocated_cross_sensor_consensus(
    df: pd.DataFrame
) -> Tuple[Dict[str, Dict[int, Dict[str, Any]]], Dict[int, Dict[str, Any]]]:
    """
    Performs colocated cross-sensor consensus verification across multi-height towers:
    - Temperature: 2m, 4m, 8m
    - Relative Humidity: 2m, 4m, 8m

    Consensus logic:
    1. Collect valid readings at timestamp t across colocated heights.
    2. If 3 sensors are available:
       - Find the pair with smallest difference |v_i - v_j|.
       - If that difference is within max_agreement_spread, they form the consensus.
       - If the third sensor deviates from the consensus by >= severe_deviation,
         that sensor is flagged with CROSS_SENSOR_SEVERE_DISAGREEMENT.
       - If all 3 sensors agree within tolerance, the consensus is marked as AGREED.
    3. If 2 sensors are available:
       - Compute pairwise difference. If > threshold, flag PAIRWISE_DISAGREEMENT.

    Returns:
        sensor_cross_evidence: Dict[sensor_name -> Dict[row_idx -> evidence_dict]]
        group_consensus_summary: Dict[row_idx -> summary_dict]
    """
    sensor_cross_evidence: Dict[str, Dict[int, Dict[str, Any]]] = {}
    group_consensus_summary: Dict[int, Dict[str, Any]] = {}

    for sensor in TEMP_SENSORS + RH_SENSORS:
        if sensor in df.columns:
            sensor_cross_evidence[sensor] = {}

    n_rows = len(df)

    # 1. Temperature Multi-Height Cross-Sensor Consensus
    t_cfg = CROSS_SENSOR_CONFIG["temperature"]
    s_temp = [s for s in t_cfg["sensors"] if s in df.columns]

    for idx in range(n_rows):
        vals = {s: df.at[idx, s] for s in s_temp if not pd.isna(df.at[idx, s])}
        if len(vals) < 2:
            continue

        if len(vals) == 3:
            s_list = list(vals.keys())
            v0, v1, v2 = vals[s_list[0]], vals[s_list[1]], vals[s_list[2]]
            
            d01 = abs(v0 - v1)
            d12 = abs(v1 - v2)
            d02 = abs(v0 - v2)

            pairs = [
                (d01, s_list[0], s_list[1], s_list[2], v0, v1, v2),
                (d12, s_list[1], s_list[2], s_list[0], v1, v2, v0),
                (d02, s_list[0], s_list[2], s_list[1], v0, v2, v1),
            ]
            pairs.sort(key=lambda x: x[0])
            min_spread, agree1, agree2, outlier_s, v_ag1, v_ag2, v_out = pairs[0]

            consensus_mean = (v_ag1 + v_ag2) / 2.0
            deviation = abs(v_out - consensus_mean)

            if min_spread <= t_cfg["max_agreement_spread"] and deviation >= t_cfg["severe_deviation"]:
                # High-confidence cross-sensor disagreement on the outlier sensor
                sensor_cross_evidence[outlier_s][idx] = {
                    "flag": "CROSS_SENSOR_SEVERE_DISAGREEMENT",
                    "severity": "SEVERE",
                    "value": float(v_out),
                    "consensus_mean": round(float(consensus_mean), 2),
                    "consensus_sensors": [agree1, agree2],
                    "consensus_spread": round(float(min_spread), 2),
                    "deviation_from_consensus": round(float(deviation), 2),
                    "details": (
                        f"{outlier_s} ({v_out:.2f}°C) severely disagrees by {deviation:.1f}°C from colocated consensus "
                        f"between {agree1} ({v_ag1:.2f}°C) and {agree2} ({v_ag2:.2f}°C) (mutual spread {min_spread:.1f}°C)."
                    ),
                }
            elif min_spread <= t_cfg["max_agreement_spread"] and deviation >= t_cfg["moderate_deviation"]:
                sensor_cross_evidence[outlier_s][idx] = {
                    "flag": "CROSS_SENSOR_MODERATE_DISAGREEMENT",
                    "severity": "WARNING",
                    "value": float(v_out),
                    "consensus_mean": round(float(consensus_mean), 2),
                    "consensus_sensors": [agree1, agree2],
                    "consensus_spread": round(float(min_spread), 2),
                    "deviation_from_consensus": round(float(deviation), 2),
                    "details": (
                        f"{outlier_s} ({v_out:.2f}°C) moderately diverges by {deviation:.1f}°C from colocated consensus "
                        f"between {agree1} ({v_ag1:.2f}°C) and {agree2} ({v_ag2:.2f}°C)."
                    ),
                }
            elif max(d01, d12, d02) <= t_cfg["max_agreement_spread"]:
                # Mutual agreement across all 3 heights
                group_consensus_summary[idx] = {
                    "temperature_agreement": True,
                    "max_spread": round(float(max(d01, d12, d02)), 2),
                }

        elif len(vals) == 2:
            s_list = list(vals.keys())
            diff = abs(vals[s_list[0]] - vals[s_list[1]])
            if diff >= t_cfg["severe_deviation"]:
                for s in s_list:
                    sensor_cross_evidence[s][idx] = {
                        "flag": "CROSS_SENSOR_PAIRWISE_DIVERGENCE",
                        "severity": "WARNING",
                        "value": float(vals[s]),
                        "other_sensor": s_list[1] if s == s_list[0] else s_list[0],
                        "pairwise_difference": round(float(diff), 2),
                        "details": f"Colocated temperature sensors {s_list[0]} ({vals[s_list[0]]}°C) and {s_list[1]} ({vals[s_list[1]]}°C) diverge by {diff:.1f}°C (3rd sensor missing).",
                    }

    # 2. Relative Humidity Multi-Height Cross-Sensor Consensus
    rh_cfg = CROSS_SENSOR_CONFIG["relative_humidity"]
    s_rh = [s for s in rh_cfg["sensors"] if s in df.columns]

    for idx in range(n_rows):
        vals = {s: df.at[idx, s] for s in s_rh if not pd.isna(df.at[idx, s])}
        if len(vals) < 2:
            continue

        if len(vals) == 3:
            s_list = list(vals.keys())
            v0, v1, v2 = vals[s_list[0]], vals[s_list[1]], vals[s_list[2]]
            
            d01 = abs(v0 - v1)
            d12 = abs(v1 - v2)
            d02 = abs(v0 - v2)

            pairs = [
                (d01, s_list[0], s_list[1], s_list[2], v0, v1, v2),
                (d12, s_list[1], s_list[2], s_list[0], v1, v2, v0),
                (d02, s_list[0], s_list[2], s_list[1], v0, v2, v1),
            ]
            pairs.sort(key=lambda x: x[0])
            min_spread, agree1, agree2, outlier_s, v_ag1, v_ag2, v_out = pairs[0]

            consensus_mean = (v_ag1 + v_ag2) / 2.0
            deviation = abs(v_out - consensus_mean)

            if min_spread <= rh_cfg["max_agreement_spread"] and deviation >= rh_cfg["severe_deviation"]:
                sensor_cross_evidence[outlier_s][idx] = {
                    "flag": "CROSS_SENSOR_SEVERE_DISAGREEMENT",
                    "severity": "SEVERE",
                    "value": float(v_out),
                    "consensus_mean": round(float(consensus_mean), 2),
                    "consensus_sensors": [agree1, agree2],
                    "consensus_spread": round(float(min_spread), 2),
                    "deviation_from_consensus": round(float(deviation), 2),
                    "details": (
                        f"{outlier_s} ({v_out:.1f}%) severely diverges by {deviation:.1f}% from colocated RH consensus "
                        f"between {agree1} ({v_ag1:.1f}%) and {agree2} ({v_ag2:.1f}%)."
                    ),
                }

    return sensor_cross_evidence, group_consensus_summary
