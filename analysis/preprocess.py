"""
preprocess.py - WeatherTrust Data Ingestion & Preprocessing

Implements schema normalization, timestamp parsing, alternating blank line handling,
whitespace stripping, gap detection, chronological sorting, and clean canonical aliasing,
while preserving original raw values and leaving the source CSV unmutated.
"""

import io
import os
from typing import Dict, Any, Tuple
import numpy as np
import pandas as pd

from .config import DATA_PATH, COLUMN_MAP, STATION_METADATA, TEMPORAL_CONFIG


def load_and_preprocess_dataset(csv_path: str = DATA_PATH) -> Tuple[pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Ingests and normalizes the MOSDAC weather dataset.

    Returns:
        df: Cleaned and normalized DataFrame with canonical column aliases.
        raw_df: DataFrame containing the original raw string values.
        metadata: Dictionary containing ingestion metadata, date ranges, and gap diagnostics.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(f"Input CSV dataset not found at path: {csv_path}")

    # 1. Handle alternating blank lines by filtering empty lines during file stream read
    non_empty_lines = []
    total_raw_lines = 0
    blank_lines_skipped = 0

    with open(csv_path, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            total_raw_lines += 1
            stripped = line.strip()
            if stripped:
                non_empty_lines.append(line)
            else:
                blank_lines_skipped += 1

    if not non_empty_lines:
        raise ValueError(f"CSV file at {csv_path} is empty.")

    # 2. Read into pandas without mutating the original file
    raw_csv_buffer = io.StringIO("".join(non_empty_lines))
    raw_df = pd.read_csv(raw_csv_buffer, dtype=str, keep_default_na=False)

    # 3. Strip whitespace from column names
    raw_df.columns = [c.strip() for c in raw_df.columns]

    # Save an unmodified copy of raw string values
    original_raw_df = raw_df.copy()

    # 4. Parse IST timestamps correctly as MM/DD/YYYY HH:MM
    ist_datetime_str = raw_df["DATE(IST)"].str.strip() + " " + raw_df["TIME(IST)"].str.strip()
    timestamp_ist = pd.to_datetime(ist_datetime_str, format="%m/%d/%Y %H:%M")

    # Also parse GMT timestamps for cross-reference
    gmt_datetime_str = raw_df["DATE(GMT)"].str.strip() + " " + raw_df["TIME(GMT)"].str.strip()
    timestamp_gmt = pd.to_datetime(gmt_datetime_str, format="%m/%d/%Y %H:%M")

    # 5. Build clean internal aliases dataframe
    clean_dict: Dict[str, Any] = {
        "timestamp_ist": timestamp_ist,
        "timestamp_gmt": timestamp_gmt,
        "date_ist_str": raw_df["DATE(IST)"].str.strip(),
        "time_ist_str": raw_df["TIME(IST)"].str.strip(),
    }

    # Invert column mapping to map raw columns to canonical aliases
    raw_to_alias = {raw_col: alias for alias, raw_col in COLUMN_MAP.items()}

    # Null string tokens to coerce to NaN
    null_tokens = {"", "na", "nan", "null", "none", "n/a"}

    # Process and coerce numeric measurement columns
    for raw_col in raw_df.columns:
        alias = raw_to_alias.get(raw_col, raw_col.lower().replace(" ", "_"))
        if alias in ["time_gmt", "date_gmt", "time_ist", "date_ist", "station_id_raw"]:
            continue

        raw_series = raw_df[raw_col].str.strip()
        # Coerce null tokens to NaN
        is_null = raw_series.str.lower().isin(null_tokens)
        
        # Try numeric conversion
        numeric_series = pd.to_numeric(raw_series.mask(is_null), errors="coerce")
        clean_dict[alias] = numeric_series

    clean_df = pd.DataFrame(clean_dict)

    # 6. Sort chronologically by timestamp_ist
    clean_df["_original_row_idx"] = np.arange(len(clean_df))
    clean_df = clean_df.sort_values(by="timestamp_ist").reset_index(drop=True)
    
    # Also synchronize raw_df sorting to keep indices strictly aligned
    original_raw_df = original_raw_df.iloc[clean_df["_original_row_idx"].values].reset_index(drop=True)

    # 7. Detect timestamp gaps
    time_diffs = clean_df["timestamp_ist"].diff()
    clean_df["time_delta_minutes"] = time_diffs.dt.total_seconds() / 60.0
    
    # Gap is defined when time delta exceeds the expected nominal interval (30 min)
    clean_df["is_timestamp_gap"] = clean_df["time_delta_minutes"] > TEMPORAL_CONFIG["max_timestamp_gap_minutes"]
    
    # Compute gap metadata statistics
    gap_records = clean_df[clean_df["is_timestamp_gap"]]
    total_gaps = len(gap_records)
    max_gap_hours = (clean_df["time_delta_minutes"].max() / 60.0) if total_gaps > 0 else 0.0

    metadata = {
        "station": STATION_METADATA,
        "total_raw_lines": total_raw_lines,
        "blank_lines_skipped": blank_lines_skipped,
        "total_observations": len(clean_df),
        "columns_count": len(clean_df.columns),
        "start_time_ist": clean_df["timestamp_ist"].min().strftime("%Y-%m-%d %H:%M:%S"),
        "end_time_ist": clean_df["timestamp_ist"].max().strftime("%Y-%m-%d %H:%M:%S"),
        "nominal_step_minutes": 30,
        "total_timestamp_gaps": int(total_gaps),
        "max_gap_hours": round(float(max_gap_hours), 2),
        "gap_summary": [
            {
                "timestamp": row["timestamp_ist"].strftime("%Y-%m-%d %H:%M:%S"),
                "gap_minutes": float(row["time_delta_minutes"]),
            }
            for _, row in gap_records.head(10).iterrows()
        ],
    }

    return clean_df, original_raw_df, metadata


if __name__ == "__main__":
    df, raw_df, meta = load_and_preprocess_dataset()
    print("=== PREPROCESSING SUCCESSFUL ===")
    print(f"Total Observations: {meta['total_observations']}")
    print(f"Period: {meta['start_time_ist']} to {meta['end_time_ist']}")
    print(f"Detected Gaps (> 60 min): {meta['total_timestamp_gaps']} (Max gap: {meta['max_gap_hours']} hours)")
    print(f"Clean columns sample: {list(df.columns[:10])}")
