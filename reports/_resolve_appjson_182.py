#!/usr/bin/env python3
from pathlib import Path
p = Path(r"C:\Users\Dell\Documents\homey\stable\app.json")
raw = p.read_text(encoding="utf-8")
if "<<<<<<< HEAD" not in raw:
    raise SystemExit("no conflict")
head = raw.split("<<<<<<< HEAD\n", 1)[1].split("\n=======", 1)[0].strip()
if '"version":"5.12.181"' in head:
    head = head.replace('"version":"5.12.181"', '"version":"5.12.182"', 1)
elif '"version": "5.12.181"' in head:
    head = head.replace('"version": "5.12.181"', '"version": "5.12.182"', 1)
elif '"version":"5.12.182"' in head or '"version": "5.12.182"' in head:
    pass
else:
    # maybe already 180 from remote
    import re
    head2, n = re.subn(r'"version"\s*:\s*"5\.12\.\d+"', '"version":"5.12.182"', head, count=1)
    if n != 1:
        raise SystemExit("unexpected version in HEAD")
    head = head2
p.write_text(head + "\n", encoding="utf-8")
print("resolved", p.stat().st_size)
