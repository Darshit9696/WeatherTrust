"""
trust_score.py - Dynamic Sensor Health & Trust Score Engine

Maintains a dynamic health/trust score (0 - 100) per sensor across time:
- Initial score = 100.0
- Penalties applied dynamically when fault signals are detected (severe vs moderate vs warning).
- Gradual recovery per clean verified healthy observation.
- Clamped strictly between 0 and 100.
- Preserves full time-series trajectory of health scores for charting.
- Categorizes final health into standard operational grades (EXCELLENT, GOOD, DEGRADED, CRITICAL, FAILED).
"""

from typing import Dict, List, Any, Tuple
import numpy as np
import pandas as pd

from .config import TRUST_SCORE_CONFIG, PRIMARY_MONITORED_SENSORS


class DynamicTrustScoreEngine:
    """
    Stateful engine that tracks health scores for all monitored weather sensors over time.
    """

    def __init__(self, monitored_sensors: List[str] = PRIMARY_MONITORED_SENSORS):
        self.monitored_sensors = monitored_sensors
        self.cfg = TRUST_SCORE_CONFIG

        # Current health state per sensor
        self.current_health: Dict[str, float] = {
            s: self.cfg["initial_health"] for s in monitored_sensors
        }

        # Complete time-series history: Dict[sensor -> List[Tuple[str, float]]]
        self.health_history: Dict[str, List[Dict[str, Any]]] = {
            s: [] for s in monitored_sensors
        }

        # Cumulative statistics
        self.fault_counts: Dict[str, int] = {s: 0 for s in monitored_sensors}
        self.warning_counts: Dict[str, int] = {s: 0 for s in monitored_sensors}
        self.clean_counts: Dict[str, int] = {s: 0 for s in monitored_sensors}
        self.missing_counts: Dict[str, int] = {s: 0 for s in monitored_sensors}

    def update_sensor_health(
        self,
        sensor: str,
        timestamp_str: str,
        classification: str,
        is_missing: bool = False,
        is_sentinel: bool = False,
    ) -> float:
        """
        Updates the health score of a single sensor at a single observation step.
        """
        if sensor not in self.current_health:
            return 100.0

        score = self.current_health[sensor]

        if is_missing:
            score -= self.cfg["penalty_missing_observation"]
            self.missing_counts[sensor] += 1

        elif classification == "PROBABLE_SENSOR_FAULT":
            if is_sentinel:
                score -= self.cfg["penalty_sentinel_fault"]
            else:
                score -= self.cfg["penalty_severe_fault"]
            self.fault_counts[sensor] += 1

        elif classification == "UNCERTAIN":
            score -= self.cfg["penalty_uncertain_warning"]
            self.warning_counts[sensor] += 1

        elif classification == "POSSIBLE_WEATHER_EXTREME":
            # Verified extreme weather does not penalize sensor health
            self.clean_counts[sensor] += 1

        elif classification == "NORMAL":
            # Gradual health recovery
            score += self.cfg["recovery_healthy_observation"]
            self.clean_counts[sensor] += 1

        # Enforce bounds [0, 100]
        score = max(self.cfg["min_health"], min(self.cfg["max_health"], score))
        self.current_health[sensor] = score

        # Record history record
        self.health_history[sensor].append({
            "timestamp": timestamp_str,
            "health": round(score, 2),
            "classification": classification,
            "is_missing": is_missing,
        })

        return score

    def get_health_grade(self, score: float) -> str:
        """
        Assigns an operational grade based on score brackets.
        """
        for grade, (low, high) in self.cfg["grade_brackets"].items():
            if low <= score <= high:
                return grade
        return "FAILED" if score < 25.0 else "EXCELLENT"

    def compute_recent_30_day_reliability(self, sensor: str) -> float:
        """
        Calculates recent 30-day reliability using a deterministic, documented formula:
        Reliability (%) = 100 * [1 - (faults + 0.3*uncertain + 0.1*missing) / total_window_obs]
        derived strictly from actual observations within 30 days of dataset end.
        """
        records = self.health_history.get(sensor, [])
        if not records:
            return 100.0

        # Parse end timestamp
        last_dt = pd.to_datetime(records[-1]["timestamp"])
        cutoff_dt = last_dt - pd.Timedelta(days=30)

        recent_records = [
            r for r in records if pd.to_datetime(r["timestamp"]) >= cutoff_dt
        ]
        n_window = len(recent_records)
        if n_window == 0:
            return 100.0

        faults = sum(1 for r in recent_records if r.get("classification") == "PROBABLE_SENSOR_FAULT")
        uncertain = sum(1 for r in recent_records if r.get("classification") == "UNCERTAIN")
        missing = sum(1 for r in recent_records if r.get("is_missing", False))

        penalty_ratio = (faults * 1.0 + uncertain * 0.3 + missing * 0.1) / n_window
        reliability = max(0.0, min(100.0, 100.0 * (1.0 - penalty_ratio)))
        return round(float(reliability), 2)

    def get_final_summary(self) -> Dict[str, Any]:
        """
        Generates final health summary statistics for all monitored sensors,
        including current_health, minimum_health, probable_fault_count, uncertain_count,
        and recent_30_day_reliability.
        """
        summary = {}
        for s in self.monitored_sensors:
            records = self.health_history.get(s, [])
            final_score = round(self.current_health[s], 2)
            min_score = round(min((r["health"] for r in records), default=100.0), 2)
            total_obs = len(records)
            uptime_pct = round(
                ((total_obs - self.fault_counts[s] - self.missing_counts[s]) / max(1, total_obs)) * 100, 2
            )
            reliability_30d = self.compute_recent_30_day_reliability(s)

            summary[s] = {
                "sensor": s,
                "current_health": final_score,
                "minimum_health": min_score,
                "probable_fault_count": int(self.fault_counts[s]),
                "uncertain_count": int(self.warning_counts[s]),
                "recent_30_day_reliability": reliability_30d,
                "status_grade": self.get_health_grade(final_score),
                "total_faults_detected": self.fault_counts[s],
                "total_warnings": self.warning_counts[s],
                "total_clean_observations": self.clean_counts[s],
                "total_missing_observations": self.missing_counts[s],
                "uptime_percentage": uptime_pct,
                "history_length": total_obs,
            }

        return summary
