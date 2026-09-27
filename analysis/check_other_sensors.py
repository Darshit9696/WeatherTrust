import csv

with open('data/mosdac_gujarat.csv', 'r', encoding='utf-8') as f:
    lines = [l for l in f if l.strip()]

rows = list(csv.DictReader(lines))

print("=== CHECKING RAINFALL ===")
rain_vals = []
for idx, r in enumerate(rows):
    v = r['RAINFALL(mm)'].strip()
    try:
        fv = float(v)
        rain_vals.append((idx, fv, r['DATE(IST)'], r['TIME(IST)']))
    except:
        pass

high_rain = [x for x in rain_vals if x[1] > 200]
print(f"Rainfall > 200 mm count: {len(high_rain)}")
for h in high_rain[:10]:
    print(f"  Row {h[0]+1}: {h[1]} mm at {h[2]} {h[3]}")

print("\n=== CHECKING DCP_TEMPERATURE ===")
dcp_vals = [float(r['DCP_TEMPERATURE(°C)'].strip()) for r in rows if r['DCP_TEMPERATURE(°C)'].strip() and r['DCP_TEMPERATURE(°C)'].strip().lower() not in ['null', 'na']]
print(f"DCP Temperature count: {len(dcp_vals)}, min: {min(dcp_vals)}, max: {max(dcp_vals)}")
dcp_counts = {}
for v in dcp_vals:
    dcp_counts[v] = dcp_counts.get(v, 0) + 1
print("DCP temp frequency:", dcp_counts)

print("\n=== CHECKING WIND DIRECTION VALUES > 360 ===")
for c in ['WIND_DIRECTION1(deg at 3m height)', 'WIND_DIRECTION2(deg at 6m height)', 'WIND_DIRECTION3(deg at 10m height)']:
    over_360 = []
    for idx, r in enumerate(rows):
        v = r[c].strip()
        try:
            fv = float(v)
            if fv > 360:
                over_360.append((idx, fv))
        except:
            pass
    print(f"{c}: {len(over_360)} values > 360 deg! Max = {max([x[1] for x in over_360]) if over_360 else 'None'}")
