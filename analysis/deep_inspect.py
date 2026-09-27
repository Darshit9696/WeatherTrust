import csv
from datetime import datetime
from collections import Counter

csv_path = 'data/mosdac_gujarat.csv'

with open(csv_path, 'r', newline='', encoding='utf-8', errors='replace') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Total rows: {len(rows)}")

# 1. Date Range
dates_gmt = [r['DATE(GMT)'] for r in rows if r['DATE(GMT)']]
dates_ist = [r['DATE(IST)'] for r in rows if r['DATE(IST)']]
times_gmt = [r['TIME(GMT)'] for r in rows if r['TIME(GMT)']]
times_ist = [r['TIME(IST)'] for r in rows if r['TIME(IST)']]

print(f"Sample DATE(GMT): {dates_gmt[:5]}, unique count: {len(set(dates_gmt))}")
print(f"Sample DATE(IST): {dates_ist[:5]}, unique count: {len(set(dates_ist))}")

# Parse dates to get true min and max
parsed_dates_gmt = []
for d, t in zip(dates_gmt, times_gmt):
    try:
        # Check format, e.g. DD/MM/YYYY or MM/DD/YYYY
        dt = datetime.strptime(f"{d} {t}", "%d/%m/%Y %H:%M")
        parsed_dates_gmt.append(dt)
    except Exception as e:
        pass

parsed_dates_ist = []
for d, t in zip(dates_ist, times_ist):
    try:
        dt = datetime.strptime(f"{d} {t}", "%d/%m/%Y %H:%M")
        parsed_dates_ist.append(dt)
    except Exception as e:
        try:
            # maybe %H:%M with single digit hour like 5:30
            dt = datetime.strptime(f"{d} {t.strip()}", "%d/%m/%Y %H:%M")
            parsed_dates_ist.append(dt)
        except Exception as e2:
            pass

if parsed_dates_gmt:
    print(f"GMT Date Range: {min(parsed_dates_gmt)} to {max(parsed_dates_gmt)}")
if parsed_dates_ist:
    print(f"IST Date Range: {min(parsed_dates_ist)} to {max(parsed_dates_ist)}")

# Check -33.4 anomaly
print("\n--- Searching for ~ -33.4 Temperature Anomalies ---")
temp_cols = [c for c in rows[0].keys() if 'temp' in c.lower() or 'temperature' in c.lower()]
print(f"Temperature columns found: {temp_cols}")

found_anomalies = []
for idx, r in enumerate(rows):
    for c in temp_cols:
        val_str = r[c].strip()
        try:
            val_float = float(val_str)
            if -35.0 <= val_float <= -30.0:
                found_anomalies.append((idx, r.get('DATE(IST)'), r.get('TIME(IST)'), c, val_float))
        except ValueError:
            pass

print(f"Total values between -35.0 and -30.0 across temp cols: {len(found_anomalies)}")
for a in found_anomalies[:20]:
    print(f"  Row {a[0]} | Date(IST): {a[1]} {a[2]} | Col: {a[3]} | Val: {a[4]}")

# Let's inspect air temperature negative values
print("\n--- Negative values in AIR_TEMPERATURE columns ---")
air_temp_cols = [c for c in temp_cols if 'AIR_TEMPERATURE' in c]
for c in air_temp_cols:
    negs = []
    for idx, r in enumerate(rows):
        val_str = r[c].strip()
        try:
            val_float = float(val_str)
            if val_float < 5.0:  # in Gujarat, below 5 deg C is very rare or anomalous
                negs.append((idx, r.get('DATE(IST)'), r.get('TIME(IST)'), val_float))
        except ValueError:
            pass
    print(f"Column '{c}': total values < 5.0 C: {len(negs)}")
    if negs:
        # print min and sample negs
        min_neg = min(negs, key=lambda x: x[3])
        print(f"  Min value in {c}: {min_neg[3]} at row {min_neg[0]} ({min_neg[1]} {min_neg[2]})")
        print(f"  First 5 low values: {negs[:5]}")

# Check 0 mbar atmospheric pressure
print("\n--- Atmospheric Pressure Check ---")
press_cols = [c for c in rows[0].keys() if 'atm' in c.lower() or 'press' in c.lower()]
print(f"Pressure columns found: {press_cols}")
for c in press_cols:
    zeroes = []
    lows = []
    for idx, r in enumerate(rows):
        val_str = r[c].strip()
        try:
            val_float = float(val_str)
            if val_float == 0.0:
                zeroes.append((idx, r.get('DATE(IST)'), r.get('TIME(IST)'), val_float))
            elif val_float < 800:
                lows.append((idx, r.get('DATE(IST)'), r.get('TIME(IST)'), val_float))
        except ValueError:
            pass
    print(f"Column '{c}': 0.0 count: {len(zeroes)}, <800 count: {len(lows)}")
    for z in zeroes:
        print(f"  Row {z[0]} | Date(IST): {z[1]} {z[2]} | Val: {z[3]}")
