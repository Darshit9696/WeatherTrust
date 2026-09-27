export interface StationMetadata {
  station_id: string;
  station_name: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  altitude_m: number | null;
  nominal_interval_minutes: number;
  timezone: string;
}

export interface DatasetMetadata {
  total_observations: number;
  start_time_ist: string;
  end_time_ist: string;
  nominal_interval_minutes: number;
  total_timestamp_gaps: number;
  max_gap_hours: number;
  columns_processed: number;
}

export interface SummaryStatistics {
  total_sensor_evaluations: number;
  total_flagged_events: number;
  classification_breakdown: {
    NORMAL: number;
    PROBABLE_SENSOR_FAULT: number;
    POSSIBLE_WEATHER_EXTREME: number;
    UNCERTAIN: number;
  };
  isolation_forest_meta: {
    n_estimators: number;
    contamination: number;
    random_state: number;
    feature_count: number;
    total_outliers: number;
    outlier_percentage: number;
  };
  validation_events_verified: {
    march_19_negative_33_temp: boolean;
    sept_21_zero_mbar_pressure: boolean;
  };
}

export interface SensorHealthRecord {
  sensor: string;
  current_health: number;
  minimum_health: number;
  probable_fault_count: number;
  uncertain_count: number;
  recent_30_day_reliability: number;
  status_grade: string;
  total_faults_detected: number;
  total_warnings: number;
  total_clean_observations: number;
  total_missing_observations: number;
  uptime_percentage: number;
  history_length: number;
}

export interface HealthHistoryPoint {
  timestamp: string;
  health: number;
  classification?: string;
  is_missing?: boolean;
}

export interface FlaggedEvent {
  timestamp: string;
  row_idx: number;
  sensor: string;
  raw_value: string;
  numeric_value: number | null;
  classification: 'PROBABLE_SENSOR_FAULT' | 'POSSIBLE_WEATHER_EXTREME' | 'UNCERTAIN' | 'NORMAL';
  confidence: number;
  if_score: number;
  if_outlier: boolean;
  rule_flags: string[];
  cross_sensor_evidence?: {
    flag: string;
    value: number;
    consensus_mean?: number;
    consensus_sensors?: string[];
    consensus_spread?: number;
    deviation_from_consensus?: number;
    details: string;
  } | null;
  temporal_evidence?: {
    flag: string;
    value: number;
    prev_value?: number;
    next_value?: number;
    delta_prev?: number;
    delta_next?: number;
    baseline_diff?: number;
    rolling_median?: number;
    robust_z?: number;
    details: string;
  } | null;
  power_evidence?: {
    flag: string;
    voltage: number;
    details: string;
  } | null;
  fault_signals: string[];
  warning_signals: string[];
  explanation: string;
  health_score: number;
}

export interface DashboardTimeSeriesPoint {
  timestamp: string;
  temp_2m: number | null;
  temp_4m: number | null;
  temp_8m: number | null;
  rh_2m: number | null;
  pressure: number | null;
  battery_voltage: number | null;
  wind_speed_10m: number | null;
  rainfall: number | null;
  is_flagged: boolean;
}

export interface WeatherTrustResults {
  pipeline_version: string;
  station_metadata: StationMetadata;
  dataset_metadata: DatasetMetadata;
  summary_statistics: SummaryStatistics;
  final_sensor_health: Record<string, SensorHealthRecord>;
  health_history: Record<string, HealthHistoryPoint[]>;
  flagged_events: FlaggedEvent[];
  top_detected_anomalies: FlaggedEvent[];
  dashboard_time_series: DashboardTimeSeriesPoint[];
}
