# Full sweep — improve / fix / investigate (2026-08-15 evening)

## Live
- Branch: `master` → **9.0.520** (+ this push)
- Open GH issue: **#513** only (`_TZE284_hodyryli` → already in `climate_sensor_zt08`)
- Forum silent: 7 topics, **0 new FP**
- Gmail crash gate: **ok**, watch `[]`

## Fixed this sweep
1. **Syntax Check / TITAN** — `clusterUtils` bare `setTimeout` documented as module-level native (no Homey)
2. **FP collision `8eazvzo6`** — stripped again from `climate_sensor` (auto-fix-all/Blakadder had re-added it)
3. **Prevention** — `auto-fix-all.js` now runs `fix-fingerprint-conflicts.js` after Blakadder
4. **Regression test** — climate must not claim `_TZE200_8eazvzo6`; switch_wall_6gang owns it
5. **Broader conflict cleanup** — misrouted mfrs removed from climate / switch_wireless / motion_sensor_switch / etc. + `app.json` zigbee resync

## Still open (ops / user)
- Peter: Homey Test **≥5.12.81** (stable) or **≥9.0.520** (master)
- #513: re-pair on latest Test as ZT08 climate driver
- PresentSky dimmer: re-pair as Wall Dimmer (stale climate pair)
- Shared App ID Test flip awareness
