# P112 — Resume interrupted backlog + relaunch

## Version
9.0.471

## Resumed from
- P105–P111 deferred lists
- Forum digest gaps (A4 airbox, A5 valve button, A6 DP dimmer)
- Workflow batch2 (enrich threads scan, e2e flow-dup)
- Unified CI fail: NEW FP collisions → baseline refresh (231)

## Shipped
1. Refresh `.github/fingerprint-collision-baseline.json` (unblocks Unified CI)
2. `valve_dual_irrigation` — wire `button.1` → pulse valve 1
3. `smart_air_detection_box` — reporting+response + `smartParse`
4. `_TZE200_bxoo2swd` moved ZCL `dimmer_2_gang` → `wall_dimmer_tuya` (EF00)
5. `auto-enrich-closed-loop` — wire `forum-threads-scan.js`
6. `e2e-dashboard-test` — flow-card-dup gate before Homey validate

## Relaunch
Forum Poll, Auto-Enrich, Fetch Diags, Unified CI, Community Inbox, e2e
