import csv
import sys
from collections import Counter, defaultdict

csv_path = 'data/mosdac_gujarat.csv'

with open(csv_path, 'r', newline='', encoding='utf-8', errors='replace') as f:
    reader = csv.reader(f)
    header = next(reader)

print(f"Total columns: {len(header)}")
print("Header columns:")
for idx, col in enumerate(header):
    print(f"  [{idx}] {repr(col)}")

with open(csv_path, 'r', newline='', encoding='utf-8', errors='replace') as f:
    dict_reader = csv.DictReader(f)
    row_count = 0
    empty_rows = 0
    null_counts = Counter()
    min_vals = {}
    max_vals = {}
    sample_values = defaultdict(list)
    
    dates = []
    
    # Track extreme/anomalous values
    temp_anomalies = []
    pressure_zeroes = []

    for row_idx, row in enumerate(dict_reader):
        row_count += 1
        
        # Check empty row
        if not any(row.values()):
            empty_rows += 1
            continue

        for col_name, val in row.items():
            val_clean = val.strip() if val is not None else ''
            if val_clean == '' or val_clean.upper() in ['NA', 'NAN', 'NULL', 'NONE']:
                null_counts[col_name] += 1
            else:
                if len(sample_values[col_name]) < 3:
                    sample_values[col_name].append(val_clean)
                try:
                    num_val = float(val_clean)
                    if col_name not in min_vals or num_val < min_vals[col_name]:
                        min_vals[col_name] = num_val
                    if col_name not in max_vals or num_val > max_vals[col_name]:
                        max_vals[col_name] = num_val
                        
                    # Check for anomalies
                    if 'temp' in col_name.lower() or 't_' in col_name.lower():
                        if num_val < -20: # checking ~ -33.4
                            temp_anomalies.append((row_idx, col_name, num_val, row))
                    if 'press' in col_name.lower() or 'pr' in col_name.lower() or 'bar' in col_name.lower() or 'hpa' in col_name.lower():
                        if num_val == 0 or (num_val < 500 and num_val >= 0):
                            pressure_zeroes.append((row_idx, col_name, num_val, row))
                except ValueError:
                    pass

print(f"\nTotal rows read: {row_count}")
print(f"Empty rows: {empty_rows}")
print("\nColumn Summary (Nulls, Min, Max, Samples):")
for col in header:
    print(f"Col: {col}")
    print(f"  Null count: {null_counts[col]} ({null_counts[col]/row_count*100:.2f}%)")
    if col in min_vals:
        print(f"  Min: {min_vals[col]}, Max: {max_vals[col]}")
    print(f"  Samples: {sample_values[col]}")

print(f"\nPotential Temp Anomalies (< -20): {len(temp_anomalies)}")
for a in temp_anomalies[:10]:
    print(f"  Row {a[0]}: {a[1]} = {a[2]}")

print(f"\nPotential Pressure Zero / Extreme Low: {len(pressure_zeroes)}")
for a in pressure_zeroes[:10]:
    print(f"  Row {a[0]}: {a[1]} = {a[2]}")
