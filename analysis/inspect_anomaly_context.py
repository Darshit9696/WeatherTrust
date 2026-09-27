import csv

csv_path = 'data/mosdac_gujarat.csv'

with open(csv_path, 'r', newline='', encoding='utf-8', errors='replace') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print("=== CONTEXT FOR ROW 3587 (-33.4 C anomaly) ===")
cols_to_show = ['DATE(IST)', 'TIME(IST)', 'AIR_TEMPERATURE1(C at 2m height)', 'AIR_TEMPERATURE2(C at 4m height)', 'AIR_TEMPERATURE3(C at 8m height)', 'BATTRY_VOLTAGE(V)', 'ATMOSPHERIC_PRESSURE(mbar) ']
for idx in range(max(0, 3585), min(len(rows), 3591)):
    r = rows[idx]
    print(f"Row {idx:5d}: " + " | ".join(f"{c.split('(')[0]}: {r[c]}" for c in cols_to_show))

print("\n=== CONTEXT FOR ROWS 11650 to 11657 (0 mbar pressure anomaly) ===")
for idx in range(11650, 11658):
    r = rows[idx]
    print(f"Row {idx:5d}: " + " | ".join(f"{c.split('(')[0]}: {r[c]}" for c in cols_to_show))

print("\n=== OTHER AIR TEMP EXTREMES ===")
print("Row 8463 (-39.2 C):")
for idx in range(8461, 8466):
    r = rows[idx]
    print(f"Row {idx:5d}: " + " | ".join(f"{c.split('(')[0]}: {r[c]}" for c in cols_to_show))

print("Row 7539 (-44.6 C):")
for idx in range(7537, 7542):
    r = rows[idx]
    print(f"Row {idx:5d}: " + " | ".join(f"{c.split('(')[0]}: {r[c]}" for c in cols_to_show))
