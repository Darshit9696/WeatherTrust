import csv

with open('data/mosdac_gujarat.csv', 'r', encoding='utf-8') as f:
    lines = [l for l in f if l.strip()]

rows = list(csv.DictReader(lines))

print("=== CONTEXT FOR ROW 3588 (-33.4 C) ===")
for i in range(3585, 3591):
    r = rows[i]
    print(f"Data Row {i+1:5d} | Date={r['DATE(IST)']} {r['TIME(IST)']} IST")
    print(f"   Air Temp: 2m={r['AIR_TEMPERATURE1(°C at 2m height)']}°C | 4m={r['AIR_TEMPERATURE2(°C at 4m height)']}°C | 8m={r['AIR_TEMPERATURE3(°C at 8m height)']}°C")
    print(f"   RH:       2m={r['RELATIVE_HUMIDITY1(% at 2m height)']}% | 4m={r['RELATIVE_HUMIDITY2(% at 4m height)']}% | 8m={r['RELATIVE_HUMIDITY3(% at 8m height)']}%")
    print(f"   Press={r['ATMOSPHERIC_PRESSURE(mbar) ']} mbar | Batt={r['BATTRY_VOLTAGE(V)']} V | Wind Speed (10m)={r['WIND_SPEED3(m/s at 10m height)']} m/s")

print("\n=== CONTEXT FOR ROW 7540 (-44.6 C) ===")
for i in range(7537, 7543):
    r = rows[i]
    print(f"Data Row {i+1:5d} | Date={r['DATE(IST)']} {r['TIME(IST)']} IST")
    print(f"   Air Temp: 2m={r['AIR_TEMPERATURE1(°C at 2m height)']}°C | 4m={r['AIR_TEMPERATURE2(°C at 4m height)']}°C | 8m={r['AIR_TEMPERATURE3(°C at 8m height)']}°C")

print("\n=== CONTEXT FOR ROW 8464 (-39.2 C) ===")
for i in range(8461, 8467):
    r = rows[i]
    print(f"Data Row {i+1:5d} | Date={r['DATE(IST)']} {r['TIME(IST)']} IST")
    print(f"   Air Temp: 2m={r['AIR_TEMPERATURE1(°C at 2m height)']}°C | 4m={r['AIR_TEMPERATURE2(°C at 4m height)']}°C | 8m={r['AIR_TEMPERATURE3(°C at 8m height)']}°C")
