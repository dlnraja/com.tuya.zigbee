# Resolve rebase conflict: keep remote compact app.json, bump to 5.12.181
from pathlib import Path

p = Path(r"C:\Users\Dell\Documents\homey\stable\app.json")
raw = p.read_text(encoding="utf-8")
if "<<<<<<< HEAD" not in raw:
    raise SystemExit("no conflict markers")
head = raw.split("<<<<<<< HEAD\n", 1)[1]
head = head.split("\n=======", 1)[0]
# HEAD is one-line JSON (or nearly); drop any trailing newline only
head = head.strip()
if not head.startswith("{"):
    raise SystemExit("HEAD side not JSON object")
# bump version 5.12.180 -> 5.12.181
if '"version":"5.12.180"' in head:
    head = head.replace('"version":"5.12.180"', '"version":"5.12.181"', 1)
elif '"version": "5.12.180"' in head:
    head = head.replace('"version": "5.12.180"', '"version": "5.12.181"', 1)
elif '"version":"5.12.181"' in head or '"version": "5.12.181"' in head:
    pass
else:
    raise SystemExit("unexpected version in HEAD app.json")
p.write_text(head + "\n", encoding="utf-8")
print("resolved app.json -> 5.12.181, bytes", p.stat().st_size)
