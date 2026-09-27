"""
run_pipeline.py - WeatherTrust Pipeline Orchestrator & End-to-End Execution

Executes Phase 1 end-to-end:
1. Ingestion & Preprocessing (schema normalization, gap detection, chronological ordering)
2. QC Rule Evaluation (physical limits, hardware sentinels, power/battery diagnostics, frozen sensors)
3. Multi-Height Colocated Sensor Consensus (temperature & humidity)
4. Temporal Rate-of-Change & Isolated Spike Detection
5. Unsupervised Multivariate Isolation Forest Scoring
6. Dynamic Per-Sensor Health / Trust Score Engine Tracking
7. Multi-Evidence Classification & Explanation Generation
8. Explicit Verification of Known Validation Events (-33.4°C on 19 March 2016 and 0 mbar on 21 Sept 2016)
9. JSON Export to output/weathertrust_results.json
10. Comprehensive Sanity Check & Meteorological Diagnostic Reporting
"""

import json
import os
import sys
from typing import Dict, List, Any
import numpy as np
import pandas as pd

from .config import (
    DATA_PATH,
    OUTPUT_DIR,
    RESULTS_JSON_PATH,
    PRIMARY_MONITORED_SENSORS,
    PHYSICAL_LIMITS,
    CROSS_SENSOR_CONFIG,
    TEMPORAL_CONFIG,
    ISOLATION_FOREST_CONFIG,
    TRUST_SCORE_CONFIG,
)
from .preprocess import load_and_preprocess_dataset
from .qc import (
    evaluate_physical_and_sentinel_rules,
    evaluate_battery_diagnostics,
    evaluate_frozen_sensors,
    evaluate_colocated_cross_sensor_consensus,
)
from .anomaly_detection import (
    compute_temporal_evidence,
    run_isolation_forest,
    classify_sensor_observation,
)
from .trust_score import DynamicTrustScoreEngine


def execute_pipeline() -> Dict[str, Any]:
    print("=" * 70)
    print("WEATHERTRUST PIPELINE: PHASE 1 EXECUTION")
    print("=" * 70)

    # 1. Ingestion & Preprocessing
    print("\n[Step 1/8] Loading and preprocessing dataset...")
    df, raw_df, meta = load_and_preprocess_dataset(DATA_PATH)
    n_rows = len(df)
    print(f" -> Processed {n_rows} observations spanning {meta['start_time_ist']} to {meta['end_time_ist']}.")
    print(f" -> Identified {meta['total_timestamp_gaps']} timestamp gaps (> 60 min).")

    # 2. Rule QC & Diagnostic Checks
    print("\n[Step 2/8] Evaluating physical limits and hardware sentinels...")
    physical_flags = evaluate_physical_and_sentinel_rules(df, raw_df)

    print("\n[Step 3/8] Evaluating power/battery diagnostics and frozen sensors...")
    battery_events = evaluate_battery_diagnostics(df)
    frozen_flags = evaluate_frozen_sensors(df)
    print(f" -> Battery anomalies detected: {len(battery_events)}")

    # 3. Colocated Multi-Height Sensor Consensus
    print("\n[Step 4/8] Computing colocated multi-height cross-sensor consensus...")
    cross_evidence, group_consensus = evaluate_colocated_cross_sensor_consensus(df)
    severe_cross_count = sum(
        1 for s, evs in cross_evidence.items() for ev in evs.values() if ev.get("flag") == "CROSS_SENSOR_SEVERE_DISAGREEMENT"
    )
    print(f" -> Severe cross-sensor consensus disagreements: {severe_cross_count}")

    # 4. Temporal Evidence & Isolated Spikes
    print("\n[Step 5/8] Computing temporal rates of change and isolated spike rebounds...")
    temporal_evidence = compute_temporal_evidence(df)
    spike_count = sum(
        1 for s, evs in temporal_evidence.items() for ev in evs.values() if ev.get("flag") == "TEMPORAL_ISOLATED_SPIKE"
    )
    print(f" -> Isolated transient spike rebounds detected: {spike_count}")

    # 5. Isolation Forest Unsupervised Anomaly Scoring
    print("\n[Step 6/8] Running multivariate Isolation Forest model...")
    if_scores, if_outliers, if_meta = run_isolation_forest(df)
    print(f" -> IF scored {n_rows} rows: {if_meta['total_outliers']} outliers ({if_meta['outlier_percentage']}%)")

    # 6. Sequential Step-by-Step Trust Score Engine & Evidence Classification
    print("\n[Step 7/8] Running sequential Dynamic Health Engine and evidence classification...")
    trust_engine = DynamicTrustScoreEngine(PRIMARY_MONITORED_SENSORS)

    all_classified_events: List[Dict[str, Any]] = []
    classification_counts = {
        "NORMAL": 0,
        "PROBABLE_SENSOR_FAULT": 0,
        "POSSIBLE_WEATHER_EXTREME": 0,
        "UNCERTAIN": 0,
    }

    # Iterate chronologically through observations
    for i in range(n_rows):
        ts_str = df["timestamp_ist"].iloc[i].strftime("%Y-%m-%d %H:%M:%S")
        batt_ev = battery_events.get(i)
        is_if_outlier = bool(if_outliers[i])
        score_if = float(if_scores[i])

        for sensor in PRIMARY_MONITORED_SENSORS:
            if sensor not in df.columns:
                continue

            num_val = df.at[i, sensor]
            raw_v = raw_df.at[i, sensor] if sensor in raw_df.columns else str(num_val)
            is_miss = pd.isna(num_val)

            rule_ev = physical_flags.get(sensor, {}).get(i)
            cross_ev = cross_evidence.get(sensor, {}).get(i)
            temp_ev = temporal_evidence.get(sensor, {}).get(i)
            froz_ev = frozen_flags.get(sensor, {}).get(i)

            classified = classify_sensor_observation(
                sensor=sensor,
                row_idx=i,
                raw_val=raw_v,
                float_val=None if is_miss else float(num_val),
                rule_evidence=rule_ev,
                cross_evidence=cross_ev,
                temporal_ev=temp_ev,
                battery_ev=batt_ev,
                frozen_ev=froz_ev,
                if_score=score_if,
                if_outlier=is_if_outlier,
                timestamp_str=ts_str,
            )

            c_label = classified["classification"]
            classification_counts[c_label] += 1

            is_sentinel_fault = bool(rule_ev and rule_ev.get("flag") in ["HARDWARE_SENTINEL_FAULT", "PHYSICAL_LOWER_BOUND_VIOLATION"])

            current_h = trust_engine.update_sensor_health(
                sensor=sensor,
                timestamp_str=ts_str,
                classification=c_label,
                is_missing=is_miss,
                is_sentinel=is_sentinel_fault,
            )
            classified["health_score"] = round(current_h, 2)

            # Store flagged (non-NORMAL) events
            if c_label != "NORMAL":
                all_classified_events.append(classified)

    final_health_summary = trust_engine.get_final_summary()

    # 7. Verification of Known Events
    print("\n[Step 8/8] Explicitly verifying known validation events...")
    
    # Event A: 19 March 2016 ~11:30 IST 4m temp around -33.4°C
    known_event_a = None
    for ev in all_classified_events:
        if ev["sensor"] == "temp_4m" and "2016-03-19" in ev["timestamp"] and "11:30" in ev["timestamp"]:
            known_event_a = ev
            break

    # Event B: 21 September 2016 0 mbar pressure / battery failure event
    known_events_b = [
        ev for ev in all_classified_events
        if "2016-09-21" in ev["timestamp"] and (ev["sensor"] == "pressure" or ev["sensor"] == "battery_voltage")
    ]

    print("\n" + "=" * 70)
    print("VERIFICATION RESULTS FOR KNOWN VALIDATION EVENTS")
    print("=" * 70)

    print("\n[A] 19 March 2016 ~11:30 IST 4m Temperature Anomaly:")
    if known_event_a:
        print(f" -> DETECTED: YES")
        print(f" -> Timestamp:      {known_event_a['timestamp']}")
        print(f" -> Sensor:         {known_event_a['sensor']}")
        print(f" -> Raw Value:      {known_event_a['raw_value']} °C")
        print(f" -> Classification: {known_event_a['classification']}")
        print(f" -> Confidence:     {known_event_a['confidence'] * 100:.1f}%")
        print(f" -> Rule Flags:     {known_event_a['rule_flags']}")
        print(f" -> Fault Signals:  {known_event_a['fault_signals']}")
        print(f" -> Explanation:    {known_event_a['explanation']}")
    else:
        print(" -> DETECTED: NO (Failed to match target)")

    print("\n[B] 21 September 2016 0 mbar Pressure / Battery Failure Event:")
    if known_events_b:
        print(f" -> DETECTED: YES (Found {len(known_events_b)} flagged records)")
        for kb in known_events_b[:4]:
            print(f"    * [{kb['timestamp']}] Sensor={kb['sensor']} | Raw={kb['raw_value']} | Class={kb['classification']} | Conf={kb['confidence']*100:.0f}%")
            print(f"      Explanation: {kb['explanation']}")
    else:
        print(" -> DETECTED: NO (Failed to match target)")

    # 8. Time-series data construction for Dashboard Export
    # To keep dashboard export optimal while containing full fidelity, include key parameters
    print("\nAssembling export data structure...")
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Downsample health history for charting (record every 24 hours / daily average or significant shifts)
    downsampled_health_history = {}
    for s, hist in trust_engine.health_history.items():
        # Store every 20th point + all points where health is < 99.0
        sampled = [h for idx, h in enumerate(hist) if idx % 24 == 0 or h["health"] < 99.0]
        downsampled_health_history[s] = sampled

    dashboard_time_series = []
    # Include sample intervals + all anomalous points
    flagged_row_indices = set(ev["row_idx"] for ev in all_classified_events)
    for i in range(0, n_rows, 4):  # 2-hour interval base
        row_dict = {
            "timestamp": df["timestamp_ist"].iloc[i].strftime("%Y-%m-%d %H:%M:%S"),
            "temp_2m": None if pd.isna(df.at[i, "temp_2m"]) else round(float(df.at[i, "temp_2m"]), 2),
            "temp_4m": None if pd.isna(df.at[i, "temp_4m"]) else round(float(df.at[i, "temp_4m"]), 2),
            "temp_8m": None if pd.isna(df.at[i, "temp_8m"]) else round(float(df.at[i, "temp_8m"]), 2),
            "rh_2m": None if pd.isna(df.at[i, "rh_2m"]) else round(float(df.at[i, "rh_2m"]), 1),
            "pressure": None if pd.isna(df.at[i, "pressure"]) else round(float(df.at[i, "pressure"]), 1),
            "battery_voltage": None if pd.isna(df.at[i, "battery_voltage"]) else round(float(df.at[i, "battery_voltage"]), 2),
            "wind_speed_10m": None if pd.isna(df.at[i, "wind_speed_10m"]) else round(float(df.at[i, "wind_speed_10m"]), 2),
            "rainfall": None if pd.isna(df.at[i, "rainfall"]) else round(float(df.at[i, "rainfall"]), 2),
            "is_flagged": (i in flagged_row_indices),
        }
        dashboard_time_series.append(row_dict)

    # Sort flagged events by severity / confidence
    severity_order = {"PROBABLE_SENSOR_FAULT": 0, "POSSIBLE_WEATHER_EXTREME": 1, "UNCERTAIN": 2}
    sorted_flagged_events = sorted(
        all_classified_events,
        key=lambda x: (severity_order.get(x["classification"], 3), -x["confidence"])
    )

    export_payload = {
        "pipeline_version": "1.0.0",
        "station_metadata": meta["station"],
        "dataset_metadata": {
            "total_observations": meta["total_observations"],
            "start_time_ist": meta["start_time_ist"],
            "end_time_ist": meta["end_time_ist"],
            "nominal_interval_minutes": meta["nominal_step_minutes"],
            "total_timestamp_gaps": meta["total_timestamp_gaps"],
            "max_gap_hours": meta["max_gap_hours"],
            "columns_processed": len(PRIMARY_MONITORED_SENSORS),
        },
        "summary_statistics": {
            "total_sensor_evaluations": n_rows * len(PRIMARY_MONITORED_SENSORS),
            "total_flagged_events": len(all_classified_events),
            "classification_breakdown": classification_counts,
            "isolation_forest_meta": if_meta,
            "validation_events_verified": {
                "march_19_negative_33_temp": known_event_a is not None,
                "sept_21_zero_mbar_pressure": len(known_events_b) > 0,
            }
        },
        "final_sensor_health": final_health_summary,
        "health_history": downsampled_health_history,
        "flagged_events": all_classified_events,
        "top_detected_anomalies": sorted_flagged_events[:50],
        "dashboard_time_series": dashboard_time_series,
    }

    with open(RESULTS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(export_payload, f, indent=2)

    print(f"\n[Done] Pipeline results successfully exported to: {RESULTS_JSON_PATH}")
    print(f" -> File size: {os.path.getsize(RESULTS_JSON_PATH) / 1024:.1f} KB")

    # 9. Sanity Check Reporting
    print("\n" + "=" * 70)
    print("PIPELINE SANITY CHECK & QUALITY REPORT")
    print("=" * 70)
    print(f"Total Observations Processed: {n_rows}")
    print(f"Total Monitored Sensor-Steps: {n_rows * len(PRIMARY_MONITORED_SENSORS)}")
    print(f"Total Flagged Events:         {len(all_classified_events)}")
    print("\nCount by Classification:")
    for k, v in classification_counts.items():
        pct = (v / (n_rows * len(PRIMARY_MONITORED_SENSORS))) * 100
        print(f"  - {k:<26}: {v:6d} ({pct:6.2f}%)")

    print("\nFinal Computed Health Score per Monitored Sensor:")
    for s, h in final_health_summary.items():
        score = h.get("current_health", h.get("final_health_score", 100.0))
        print(f"  - {s:<18}: {score:6.2f}/100 | Min: {h.get('minimum_health', score):6.2f} | 30d Rel: {h.get('recent_30_day_reliability', 100.0):5.1f}% | Grade: {h['status_grade']:<9} | Faults: {h['total_faults_detected']:3d}")

    print("\nStrongest 10 Detected Anomalies:")
    for idx, anom in enumerate(sorted_flagged_events[:10]):
        print(f"  [{idx+1:02d}] {anom['timestamp']} | Sensor: {anom['sensor']} | Val: {anom['raw_value']} | Class: {anom['classification']} | Conf: {anom['confidence']*100:.0f}%")
        print(f"       -> {anom['explanation']}")

    return export_payload


if __name__ == "__main__":
    execute_pipeline()
