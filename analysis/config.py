"""
config.py - WeatherTrust Central Configuration & QC Thresholds

Defines all dataset schema mappings, physical bounds, cross-sensor consensus thresholds,
temporal jump parameters, Isolation Forest hyperparameters, and trust score decay/recovery rates.
All thresholds are centralized here in accordance with Phase 1 requirements.
"""

import os
from typing import Dict, List, Tuple

# ==============================================================================
# PATH CONFIGURATION
# ==============================================================================
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_PATH = os.path.join(BASE_DIR, "data", "mosdac_gujarat.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
RESULTS_JSON_PATH = os.path.join(OUTPUT_DIR, "weathertrust_results.json")

# ==============================================================================
# STATION & DATASET METADATA
# ==============================================================================
STATION_METADATA = {
    "station_id": "AGROMET04_15F105",
    "station_name": "Junagadh Agricultural University, Junagadh",
    "state": "Gujarat",
    "country": "India",
    "latitude": 21.499166,
    "longitude": 70.44334,
    "altitude_m": None,  # Not provided in source CSV
    "nominal_interval_minutes": 30,
    "timezone": "Asia/Kolkata (IST, UTC+5:30)",
}

# ==============================================================================
# COLUMN ALIAS MAPPING
# Maps clean internal canonical names to raw CSV column names (whitespace stripped).
# ==============================================================================
COLUMN_MAP = {
    # Station & Time
    "station_id_raw": "@STATION_ID",
    "latitude": "LATITUDE",
    "longitude": "LONGITUDE",
    "altitude": "ALTITUDE(m)",
    "time_gmt": "TIME(GMT)",
    "date_gmt": "DATE(GMT)",
    "time_ist": "TIME(IST)",
    "date_ist": "DATE(IST)",

    # Air Temperature at multi-height levels (°C)
    "temp_2m": "AIR_TEMPERATURE1(°C at 2m height)",
    "temp_4m": "AIR_TEMPERATURE2(°C at 4m height)",
    "temp_8m": "AIR_TEMPERATURE3(°C at 8m height)",

    # Relative Humidity at multi-height levels (%)
    "rh_2m": "RELATIVE_HUMIDITY1(% at 2m height)",
    "rh_4m": "RELATIVE_HUMIDITY2(% at 4m height)",
    "rh_8m": "RELATIVE_HUMIDITY3(% at 8m height)",

    # Wind Speed at multi-height levels (m/s)
    "wind_speed_3m": "WIND_SPEED1(m/s at 3m height)",
    "wind_speed_6m": "WIND_SPEED2(m/s at 6m height)",
    "wind_speed_10m": "WIND_SPEED3(m/s at 10m height)",

    # Wind Direction at multi-height levels (deg)
    "wind_dir_3m": "WIND_DIRECTION1(deg at 3m height)",
    "wind_dir_6m": "WIND_DIRECTION2(deg at 6m height)",
    "wind_dir_10m": "WIND_DIRECTION3(deg at 10m height)",

    # Soil Temperature (°C)
    "soil_temp_0_5m": "SOIL_TEMPERATURE1(°C at 0.50m height)",
    "soil_temp_0_15m": "SOIL_TEMPERATURE2(°C at 0.15m height)",
    "soil_temp_0_30m": "SOIL_TEMPERATURE3(°C at 0.30m height)",

    # Soil Moisture (%)
    "soil_moist_0_5m": "SOIL_MOISTURE1(% at 0.50m height)",
    "soil_moist_0_15m": "SOIL_MOISTURE2(% at 0.15m height)",
    "soil_moist_0_30m": "SOIL_MOISTURE3(% at 0.30m height)",

    # Solar & Terrestrial Radiation (W/m2)
    "rad_long_out": "RAD_LONG_OUT(w/m2)",
    "rad_short_out": "RAD_SHORT_OUT(w/m2)",
    "rad_long_in": "RAD_LONG_IN(w/m2)",
    "rad_short_in": "RAD_SHORT_IN(w/m2)",
    "diffuse_rad": "DIFFUSE_RADIATION(w/m2)",

    # Soil Heat Flux (W/m2)
    "heat_flux_0_5m": "HEAT_FLUX1(w/m2 at 0.50m height)",
    "heat_flux_0_2m": "HEAT_FLUX2(w/m2 at 0.20m height)",

    # Diagnostics & Surface
    "battery_voltage": "BATTRY_VOLTAGE(V)",
    "dcp_temp": "DCP_TEMPERATURE(°C)",
    "pressure": "ATMOSPHERIC_PRESSURE(mbar)",
    "rainfall": "RAINFALL(mm)",
}

# Sensor family definitions for multi-height colocated verification
TEMP_SENSORS = ["temp_2m", "temp_4m", "temp_8m"]
RH_SENSORS = ["rh_2m", "rh_4m", "rh_8m"]
WIND_SPEED_SENSORS = ["wind_speed_3m", "wind_speed_6m", "wind_speed_10m"]
WIND_DIR_SENSORS = ["wind_dir_3m", "wind_dir_6m", "wind_dir_10m"]
SOIL_TEMP_SENSORS = ["soil_temp_0_5m", "soil_temp_0_15m", "soil_temp_0_30m"]
SOIL_MOIST_SENSORS = ["soil_moist_0_5m", "soil_moist_0_15m", "soil_moist_0_30m"]

PRIMARY_MONITORED_SENSORS = [
    "temp_2m",
    "temp_4m",
    "temp_8m",
    "rh_2m",
    "rh_4m",
    "rh_8m",
    "pressure",
    "battery_voltage",
    "wind_speed_10m",
    "rainfall",
]

# ==============================================================================
# PHYSICAL BOUNDS & SENTINEL VALUES
# Physical limits based on regional climatology and physical laws.
# Note: Climatological records for Saurashtra/Gujarat show min temp ~4°C, max ~49°C.
# ==============================================================================
PHYSICAL_LIMITS: Dict[str, Tuple[float, float]] = {
    # Temperature: Absolute physical domain bounds for ambient surface air in Gujarat
    "temp_2m": (-5.0, 55.0),
    "temp_4m": (-5.0, 55.0),
    "temp_8m": (-5.0, 55.0),
    "soil_temp_0_5m": (0.0, 55.0),
    "soil_temp_0_15m": (0.0, 60.0),
    "soil_temp_0_30m": (0.0, 55.0),

    # Relative Humidity: Physically bounded strictly to 0% - 100%
    "rh_2m": (0.0, 100.0),
    "rh_4m": (0.0, 100.0),
    "rh_8m": (0.0, 100.0),

    # Atmospheric Pressure: At ~100m elevation, normal range is 980-1025 mbar.
    # Anything below 850 mbar or above 1080 mbar is impossible in Earth's troposphere.
    "pressure": (850.0, 1080.0),

    # Battery Voltage: Standard 12V lead-acid battery with solar float charger
    "battery_voltage": (9.0, 16.5),

    # Wind Speed: 0 to 75 m/s (75 m/s is ~270 km/h super cyclone)
    "wind_speed_3m": (0.0, 75.0),
    "wind_speed_6m": (0.0, 75.0),
    "wind_speed_10m": (0.0, 75.0),

    # Wind Direction: Physical circular domain is 0° to 360°
    "wind_dir_3m": (0.0, 360.0),
    "wind_dir_6m": (0.0, 360.0),
    "wind_dir_10m": (0.0, 360.0),

    # Rainfall: Cumulative raingauge limit for annual monsoon in Gujarat (up to 3000 mm)
    "rainfall": (0.0, 3000.0),

    # Solar Radiation (W/m2)
    "rad_short_in": (0.0, 1500.0),
    "rad_short_out": (0.0, 1000.0),
    "rad_long_in": (0.0, 800.0),
    "rad_long_out": (0.0, 800.0),
    "diffuse_rad": (0.0, 1200.0),
}

# Known hardware sentinel values that indicate disconnected sensors or digital register error
HARDWARE_SENTINELS = {
    "pressure": [0.0],          # 0.0 mbar indicates transducer power loss or unread bus
    "battery_voltage": [0.0],   # 0.0 V indicates total logger power failure or dead ADC
    "dcp_temp": [-40.0],        # -40.0 °C is standard open-circuit/unconnected thermistor resistance default
}

# ==============================================================================
# CROSS-SENSOR CONSISTENCY THRESHOLDS (COLOCATED SENSORS)
# Over an 8-meter vertical tower, atmospheric stratification creates small gradients.
# Strong deviations while other colocated sensors agree indicate sensor failure.
# ==============================================================================
CROSS_SENSOR_CONFIG = {
    "temperature": {
        "sensors": TEMP_SENSORS,
        "max_agreement_spread": 4.0,    # Two sensors agreeing within 4°C form consensus
        "moderate_deviation": 6.0,      # Deviation from consensus median
        "severe_deviation": 10.0,       # Deviation indicating probable sensor fault
    },
    "relative_humidity": {
        "sensors": RH_SENSORS,
        "max_agreement_spread": 15.0,   # Agreement spread within 15% RH
        "moderate_deviation": 25.0,     # Deviation from consensus median
        "severe_deviation": 40.0,       # Severe divergence from consensus
    }
}

# ==============================================================================
# TEMPORAL RATE-OF-CHANGE & SPIKE THRESHOLDS (30-MINUTE INTERVAL)
# A severe jump followed by immediate recovery is a hallmark of electronic glitches.
# ==============================================================================
TEMPORAL_CONFIG = {
    "temp_rate_of_change_max": 8.0,      # Natural maximum change in 30 min (°C)
    "temp_spike_jump": 15.0,             # Step jump indicating potential transient glitch (°C)
    "temp_spike_rebound_tolerance": 5.0, # Difference between t+1 and t-1 (°C)

    "pressure_rate_of_change_max": 5.0,  # Max natural pressure change in 30 min (mbar)
    "pressure_spike_jump": 20.0,         # Step jump indicating sensor failure (mbar)

    "rh_rate_of_change_max": 35.0,       # Max natural RH change in 30 min (%)
    "rh_spike_jump": 45.0,               # Step jump indicating glitch (%)
    "rh_spike_rebound_tolerance": 12.0,  # Difference between t+1 and t-1 (%)

    "max_timestamp_gap_minutes": 60,     # Do not compute temporal rate if gap exceeds 1 hour
    "rolling_window_steps": 9,           # Rolling window for local median / robust dispersion (4.5 hrs)
}

# ==============================================================================
# FROZEN / STUCK SENSOR THRESHOLDS
# Atmospheric variables in outdoor environment must exhibit natural turbulence/diurnal drift.
# ==============================================================================
STUCK_SENSOR_CONFIG = {
    "min_consecutive_identical": 12,  # 12 steps = 6 hours of identical float values
    "applicable_sensors": ["temp_2m", "temp_4m", "temp_8m", "rh_2m", "rh_4m", "rh_8m", "pressure"],
    # In meteorology, 100% RH represents atmospheric saturation / dewpoint condensation during rainfall & fog
    "excluded_saturation_values": {
        "rh_2m": [100.0],
        "rh_4m": [100.0],
        "rh_8m": [100.0],
    },
}

# ==============================================================================
# POWER / BATTERY DIAGNOSTIC THRESHOLDS
# ==============================================================================
BATTERY_CONFIG = {
    "critical_voltage": 10.5,    # Below 10.5V, sensors may experience ADC brownouts
    "power_failure_voltage": 0.5,# 0.0V - 0.5V indicates total power dropout
    "overvoltage": 16.5,         # Solar charge controller failure
}

# ==============================================================================
# ISOLATION FOREST CONFIGURATION
# Unsupervised anomaly detection signal
# ==============================================================================
ISOLATION_FOREST_CONFIG = {
    "n_estimators": 100,
    "contamination": 0.01,       # 1% expected anomaly prior
    "random_state": 42,          # Fixed for full reproducibility
    "feature_columns": [
        "temp_2m", "temp_4m", "temp_8m",
        "rh_2m", "rh_4m", "rh_8m",
        "pressure", "battery_voltage",
        "wind_speed_10m"
    ],
    "diff_features": [
        ("temp_2m", "temp_4m"),
        ("temp_4m", "temp_8m"),
        ("temp_2m", "temp_8m"),
        ("rh_2m", "rh_4m"),
        ("rh_4m", "rh_8m"),
    ],
    "rate_features": [
        "temp_2m", "temp_4m", "temp_8m", "pressure"
    ]
}

# ==============================================================================
# TRUST SCORE / DYNAMIC HEALTH ENGINE CONFIGURATION
# ==============================================================================
TRUST_SCORE_CONFIG = {
    "initial_health": 100.0,
    "min_health": 0.0,
    "max_health": 100.0,

    # Penalty deductions
    "penalty_severe_fault": 30.0,      # Multi-signal confirmed probable sensor fault
    "penalty_sentinel_fault": 35.0,    # Obvious impossible sentinel value (e.g. 0 mbar)
    "penalty_moderate_fault": 15.0,    # Single strong fault signal
    "penalty_uncertain_warning": 3.0,  # Mild cross-sensor divergence or minor warning
    "penalty_missing_observation": 0.2,# Minor decay for missing observation

    # Recovery credits
    "recovery_healthy_observation": 0.5,  # Gradual health recovery per clean step

    # Health status grade brackets
    "grade_brackets": {
        "EXCELLENT": (90.0, 100.0),
        "GOOD": (75.0, 89.99),
        "DEGRADED": (50.0, 74.99),
        "CRITICAL": (25.0, 49.99),
        "FAILED": (0.0, 24.99),
    }
}
