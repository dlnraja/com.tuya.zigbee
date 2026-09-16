import json
from pathlib import Path
p = Path(r"C:\Users\Dell\Documents\homey\stable\scripts\data\current-fps.json")
j = json.loads(p.read_text(encoding="utf-8"))
# reverse map
for key in ("_tze204_5slehgeo", "_TZE204_5slehgeo", "_tze284_5slehgeo", "_TZE284_5slehgeo"):
    if key in j.get("m2d", {}):
        j["m2d"][key] = ["curtain_motor"]
        print("m2d", key, "-> curtain_motor")
# climate array
arr = j.get("r", {}).get("climate_sensor", {}).get("m")
if isinstance(arr, list):
    before = len(arr)
    j["r"]["climate_sensor"]["m"] = [m for m in arr if "5slehgeo" not in str(m).lower()]
    print("climate.m", before, "->", len(j["r"]["climate_sensor"]["m"]))
p.write_text(json.dumps(j, indent=2) + "\n", encoding="utf-8")
print("done")
