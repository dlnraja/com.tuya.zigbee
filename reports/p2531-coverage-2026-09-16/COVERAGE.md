# P2531 complementary coverage mega — 2026-09-16

Mode: **apply** | Crawl: **yes** | ok=true

| Metric | Before | After | Δ |
|--------|--------|-------|---|
| Drivers | 431 | 431 | 0 |
| MFR entries | 14639 | 14809 | 170 |
| PID entries | 3019 | 3017 | -2 |

## Phases

- forum-silent-scan: OK
- forum-process: OK
- forum-media: OK
- mega-z2m: OK
- mega-zha: soft-fail
- mega-blakadder: OK
- mega-deconz: OK
- source-diff: OK
- cross-ref-all: OK
- fleet-intelligent: OK
- multi-source: OK
- variants-recent: OK
- deep-functional: OK
- case-variants: OK
- strip-forbidden: OK
- re-inject-sacred: OK
- dimmer-fw-sync: OK
- gate-p2138: OK
- gate-p2519: OK
- gate-p2520: OK
- gate-anti-bot: OK
- check-p2530: OK

✅ Coverage maintained or enriched (complementary)

Sources: Homey forum silent, Z2M, ZHA, Blakadder, deCONZ, market couples, OEM case overlays.
Never forum POST (T157628). Never invent pid.
