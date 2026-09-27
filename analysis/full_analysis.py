import csv
from datetime import datetime
from collections import Counter, defaultdict

csv_path = 'data/mosdac_gujarat.csv'

with open(csv_path, 'r', encoding='utf-8') as f:
    lines = [line for line in f if line.strip()]

reader = csv.reader(lines)
header = next(reader)
rows = list(reader)

total_rows = len(rows)
col_idx = {name: idx for idx, name in enumerate(header)}

print(f"=== BASIC INFO ===")
print(f"Total rows (excluding header): {total_rows}")
print(f"Total columns: {len(header)}")

# Parse Timestamps
parsed_ist = []
parsed_gmt = []
for r in rows:
    d_ist = r[col_idx['DATE(IST)']].strip()
    t_ist = r[col_idx['TIME(IST)']].strip()
    d_gmt = r[col_idx['DATE(GMT)']].strip()
    t_gmt = r[col_idx['TIME(GMT)']].strip()
    dt_i = datetime.strptime(f'{d_ist} {t_ist}', '%m/%d/%Y %H:%M')
    dt_g = datetime.strptime(f'{d_gmt} {t_gmt}', '%m/%d/%Y %H:%M')
    parsed_ist.append(dt_i)
    parsed_gmt.append(dt_g)

print(f"GMT Range: {min(parsed_gmt)} to {max(parsed_gmt)}")
print(f"IST Range: {min(parsed_ist)} to {max(parsed_ist)}")

# Check time steps / sampling interval
deltas = Counter()
for i in range(1, len(parsed_ist)):
    diff = (parsed_ist[i] - parsed_ist[i-1]).total_seconds() / 60
    deltas[diff] += 1
print("\nSampling Interval Distribution:")
for diff, cnt in deltas.most_common(5):
    print(f"  {diff} min: {cnt} intervals ({cnt/len(rows)*100:.2f}%)")

# Detailed column statistics
print("\n=== COLUMN SCHEMA & VALUE STATS ===")
null_representations = Counter()

col_details = []
for idx, col in enumerate(header):
    raw_vals = [r[idx].strip() for r in rows]
    nulls = 0
    numeric_vals = []
    text_vals = []
    
    for v in raw_vals:
        if v == '' or v.lower() in ['null', 'nan', 'na', 'none']:
            nulls += 1
            if v != '':
                null_representations[v] += 1
        else:
            try:
                num = float(v)
                numeric_vals.append(num)
            except ValueError:
                text_vals.append(v)
                
    is_num = len(numeric_vals) > 0 and len(text_vals) == 0
    col_details.append({
        'idx': idx,
        'name': col,
        'nulls': nulls,
        'pct_null': (nulls / total_rows) * 100,
        'is_num': is_num,
        'min': min(numeric_vals) if numeric_vals else None,
        'max': max(numeric_vals) if numeric_vals else None,
        'samples': [v for v in raw_vals if v and v.lower() not in ['null', 'nan', 'na']][:3]
    })

for c in col_details:
    num_str = f"Min: {c['min']}, Max: {c['max']}" if c['is_num'] else "Categorical/Text/DateTime"
    print(f"[{c['idx']:02d}] {repr(c['name'])}")
    print(f"     Nulls: {c['nulls']:5d} ({c['pct_null']:6.2f}%) | {num_str}")

print(f"\nNull tokens found in file: {dict(null_representations)}")

# Categorization of columns
print("\n=== SPECIFIC COLUMN GROUPINGS ===")

# Temperature columns
temp_cols = [c for c in header if 'temp' in c.lower()]
print(f"1. Temperature Columns ({len(temp_cols)}):")
for c in temp_cols:
    print(f"   - {repr(c)}")

# Relative humidity columns
rh_cols = [c for c in header if 'humid' in c.lower() or 'rh' in c.lower()]
print(f"\n2. Relative Humidity Columns ({len(rh_cols)}):")
for c in rh_cols:
    print(f"   - {repr(c)}")

# Atmospheric pressure columns
press_cols = [c for c in header if 'press' in c.lower() or 'atm' in c.lower() or 'mbar' in c.lower()]
print(f"\n3. Atmospheric Pressure Columns ({len(press_cols)}):")
for c in press_cols:
    print(f"   - {repr(c)}")

# Battery voltage columns
batt_cols = [c for c in header if 'batt' in c.lower() or 'volt' in c.lower()]
print(f"\n4. Battery Voltage Columns ({len(batt_cols)}):")
for c in batt_cols:
    print(f"   - {repr(c)}")

# Timestamps
time_cols = [c for c in header if 'date' in c.lower() or 'time' in c.lower()]
print(f"\n5. Timestamp Columns ({len(time_cols)}):")
for c in time_cols:
    print(f"   - {repr(c)}")

# Multi-height sensors
print("\n=== MULTI-HEIGHT SENSOR FAMILIES ===")
families = {
    'Air Temperature': [c for c in header if 'air_temp' in c.lower()],
    'Relative Humidity': [c for c in header if 'relative_humidity' in c.lower()],
    'Wind Speed': [c for c in header if 'wind_speed' in c.lower()],
    'Wind Direction': [c for c in header if 'wind_direction' in c.lower()],
    'Soil Temperature': [c for c in header if 'soil_temperature' in c.lower()],
    'Soil Moisture': [c for c in header if 'soil_moisture' in c.lower()],
    'Heat Flux': [c for c in header if 'heat_flux' in c.lower()],
}
for fam, cols in families.items():
    print(f"{fam} ({len(cols)} levels):")
    for c in cols:
        print(f"  * {repr(c)}")

# Verification of anomalies
print("\n=== EXACT ANOMALY VERIFICATION ===")

# Anomaly 1: ~ -33.4 deg C
print("\n[A] TEMPERATURE ANOMALY CHECK (~ -33.4 °C):")
matched_temps = []
for i, r in enumerate(rows):
    for c in temp_cols:
        val_str = r[col_idx[c]].strip()
        try:
            val_f = float(val_str)
            if abs(val_f - (-33.4)) <= 0.5:
                matched_temps.append((i, c, val_f, r))
        except ValueError:
            pass

print(f"Matches found within [-33.9, -32.9] °C: {len(matched_temps)}")
for i, c, val_f, r in matched_temps:
    print(f"Row {i} (1-indexed CSV line {i*2 + 3} counting blank lines, data row {i+1}):")
    print(f"  Exact Column: {repr(c)}")
    print(f"  Exact Value:  {val_f} °C")
    print(f"  Station:      {r[col_idx['@STATION_ID']]}")
    print(f"  DATE(IST):    {r[col_idx['DATE(IST)']]} {r[col_idx['TIME(IST)']]} (GMT: {r[col_idx['DATE(GMT)']]} {r[col_idx['TIME(GMT)']]})")
    print(f"  Comparison with other air temperature heights at that exact moment:")
    print(f"    AIR_TEMPERATURE1 (2m): {r[col_idx['AIR_TEMPERATURE1(°C at 2m height)']]}")
    print(f"    AIR_TEMPERATURE2 (4m): {r[col_idx['AIR_TEMPERATURE2(°C at 4m height)']]}")
    print(f"    AIR_TEMPERATURE3 (8m): {r[col_idx['AIR_TEMPERATURE3(°C at 8m height)']]}")
    print(f"    BATTRY_VOLTAGE:        {r[col_idx['BATTRY_VOLTAGE(V)']]}")

# Check other negative air temperatures
other_neg_air = []
for i, r in enumerate(rows):
    for c in ['AIR_TEMPERATURE1(°C at 2m height)', 'AIR_TEMPERATURE2(°C at 4m height)', 'AIR_TEMPERATURE3(°C at 8m height)']:
        v = r[col_idx[c]].strip()
        try:
            vf = float(v)
            if vf < 0:
                other_neg_air.append((i, c, vf, r['DATE(IST)'], r['TIME(IST)']))
        except ValueError:
            pass
print(f"\nAll negative AIR_TEMPERATURE occurrences across all 3 heights: {len(other_neg_air)}")
for o in other_neg_air:
    print(f"  Data row {o[0]+1} | {o[3]} {o[4]} | {o[1]} = {o[2]} °C")

# Anomaly 2: 0 mbar atmospheric pressure
print("\n[B] ATMOSPHERIC PRESSURE ANOMALY CHECK (0 mbar):")
matched_press = []
p_col = press_cols[0]
for i, r in enumerate(rows):
    val_str = r[col_idx[p_col]].strip()
    try:
        val_f = float(val_str)
        if val_f == 0.0:
            matched_press.append((i, p_col, val_f, r))
    except ValueError:
        pass

print(f"Matches found with exact 0 mbar: {len(matched_press)}")
for i, c, val_f, r in matched_press:
    print(f"Row {i} (data row {i+1}):")
    print(f"  Column:    {repr(c)}")
    print(f"  Value:     {val_f} mbar")
    print(f"  Station:   {r[col_idx['@STATION_ID']]}")
    print(f"  DATE(IST): {r[col_idx['DATE(IST)']]} {r[col_idx['TIME(IST)']]} (GMT: {r[col_idx['DATE(GMT)']]} {r[col_idx['TIME(GMT)']]})")
    print(f"  AIR_TEMP1: {r[col_idx['AIR_TEMPERATURE1(°C at 2m height)']]}, AIR_TEMP2: {r[col_idx['AIR_TEMPERATURE2(°C at 4m height)']]}, AIR_TEMP3: {r[col_idx['AIR_TEMPERATURE3(°C at 8m height)']]}")
    print(f"  BATTRY_VOLTAGE: {r[col_idx['BATTRY_VOLTAGE(V)']]}")

