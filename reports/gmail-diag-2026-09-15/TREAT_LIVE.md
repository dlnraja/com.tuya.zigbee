# L99 treat — Gmail + GitHub + Homey + Forum (2026-09-15)

Silent only. Never forum POST. Never invent pid.

## Homey Athom tip (Gmail)

| Build | App | State |
|-------|-----|--------|
| **#3192** | **9.0.932** Universal | **testing** (live tip) |
| #3191 | 9.0.930 | testing |
| #3190 | 9.0.931 | testing |
| #3187 / #3184 | 9.0.928 / 9.0.924 | processing_failed socket hang up — **P139 do not spam** |
| Stable **#115** | `com.dlnraja.tuya.zigbee.stable` | testing |

## Diagnostics (Gmail thread 2026-09-14)

UUIDs extracted: see `GMAIL_DIAG_UUIDS.json`

| UUID prefix | Vers (thread) | Treat |
|-------------|---------------|--------|
| `a5304ce8` | 9.0.916 | Peter battery strip — **P2488/P2490** tip ≥9.0.923 |
| `77394256` | 9.0.926 | Peter #2238 battery getable — **P2499** tip ≥9.0.930 prefer **≥9.0.932** |
| others in list | 9.0.916–926 | tip-lag / already mapped fleet (VicHY/curtain/button) |

## Forum T140352

| Post | User | Action |
|------|------|--------|
| **#2238** | Peter | Still no Smartbutton battery/History after re-add @ `77394256` — tip **≥9.0.932** (P2499+P2500) |
| #2236 | PresentSky | RESOLVED re-add |
| VicHY / Eduard / MIAMO | | P2490/P2502 complementary matrix already shipped |

## GitHub open

| Issue | Couple / signal | Treat |
|-------|-----------------|--------|
| **#548** | crash @ 9.0.908 diag `97413373` | **P2484** OOM MaxListeners — tip-lag ≥9.0.914 |
| **#547** | `_TZE204_gkfbdvyx`+TS0601 radar Unknown | **P2484** sacred-keep — tip ≥9.0.914 + re-pair |
| **#533** | `_TZE204_5slehgeo`+TS0601 Moes curtain → TRV/Unknown | Already `curtain_motor` + sacred-keep; **P2503** forbid climate bleed in registry + fix `current-fps` reverse map |

## Code shipped this pass (P2503)

1. misattribution: forbid `climate_sensor` for 5slehgeo couple  
2. `scripts/data/current-fps.json`: reverse map → `curtain_motor`; strip from climate_sensor.m  
3. `test/critical/p2503-gh533-5slehgeo-curtain.test.js`  
4. This TREAT report  

## Gates

```bash
npm run check:p2503
npm run check:p2499
npm run check:p2484
```

## Dual-app

P2503 BOTH (reliability / sacred couple). No forum comments (GITHUB_HUMANIZE — silent).
