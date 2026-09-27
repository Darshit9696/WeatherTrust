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

# Battery voltage details
batt_col = 'BATTRY_VOLTAGE(V)'
batt_vals = []
for r in rows:
    v = r[col_idx[batt_col]].strip()
    if v and v.lower() not in ['null', 'nan', 'na']:
        batt_vals.append(float(v))

print(f"Battery Voltage Stats: Count={len(batt_vals)}, Min={min(batt_vals)}, Max={max(batt_vals)}")
print(f"  Exact 0.0V: {sum(1 for x in batt_vals if x == 0.0)}")
print(f"  < 11.5V: {sum(1 for x in batt_vals if x < 11.5)}")
print(f"  > 15.0V: {sum(1 for x in batt_vals if x > 15.0)}")

# Check other negative air temperatures
other_neg_air = []
for i, r in enumerate(rows):
    for c in ['AIR_TEMPERATURE1(°C at 2m height)', 'AIR_TEMPERATURE2(°C at 4m height)', 'AIR_TEMPERATURE3(°C at 8m height)']:
        v = r[col_idx[c]].strip()
        try:
            vf = float(v)
            if vf < 0:
                other_neg_air.append((i, c, vf, r[col_idx['DATE(IST)']], r[col_idx['TIME(IST)']]))
        except ValueError:
            pass

print(f"\nAll negative AIR_TEMPERATURE occurrences across all 3 heights: {len(other_neg_air)}")
for o in other_neg_air:
    print(f"  Data row {o[0]+1} | {o[3]} {o[4]} | {o[1]} = {o[2]} °C")

# Check 0 mbar atmospheric pressure
press_col = 'ATMOSPHERIC_PRESSURE(mbar) '
matched_press = []
for i, r in enumerate(rows):
    val_str = r[col_idx[press_col]].strip()
    try:
        val_f = float(val_str)
        if val_f == 0.0:
            matched_press.append((i, press_col, val_f, r))
    except ValueError:
        pass

print(f"\nMatches found with exact 0 mbar: {len(matched_press)}")
for i, c, val_f, r in matched_press:
    print(f"Row {i} (data row {i+1}):")
    print(f"  Column:    {repr(c)}")
    print(f"  Value:     {val_f} mbar")
    print(f"  Station:   {r[col_idx['@STATION_ID']]}")
    print(f"  DATE(IST): {r[col_idx['DATE(IST)']]} {r[col_idx['TIME(IST)']]} (GMT: {r[col_idx['DATE(GMT)']]} {r[col_idx['TIME(GMT)']]})")
    print(f"  AIR_TEMP1: {r[col_idx['AIR_TEMPERATURE1(°C at 2m height)']]}, AIR_TEMP2: {r[col_idx['AIR_TEMPERATURE2(°C at 4m height)']]}, AIR_TEMP3: {r[col_idx['AIR_TEMPERATURE3(°C at 8m height)']]}")
    print(f"  BATTRY_VOLTAGE: {r[col_idx['BATTRY_VOLTAGE(V)']]}")

# Check surrounding rows of the 0 mbar events
print("\nSurrounding rows for 0 mbar events (rows 11651 to 11656):")
for idx in range(11650, 11657):
    r = rows[idx]
    print(f"Data row {idx+1} | {r[col_idx['DATE(IST)']]} {r[col_idx['TIME(IST)']]} | Press: {r[col_idx[press_col]]} | Temp1: {r[col_idx['AIR_TEMPERATURE1(°C at 2m height)']]} | Temp2: {r[col_idx['AIR_TEMPERATURE2(°C at 4m height)']]} | Temp3: {r[col_idx['AIR_TEMPERATURE3(°C at 8m height)']]} | Batt: {r[col_idx['BATTRY_VOLTAGE(V)']]}")
