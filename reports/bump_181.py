import json
from pathlib import Path
root = Path(r"C:\Users\Dell\Documents\homey\stable")
for name in ("app.json",):
    p = root / name
    j = json.loads(p.read_text(encoding="utf-8"))
    j["version"] = "5.12.181"
    p.write_text(json.dumps(j) + "\n", encoding="utf-8")
    print(name, j["version"])
