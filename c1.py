import json
with open("docs/reports/ZERO_DEFECT_AUDIT.json") as f: d=json.load(f)
collisions=d["collisions"]
print(len(collisions))