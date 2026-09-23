# P2705 — HiepSVG emails / GH#550 L99 treat (2026-09-23)

## Sources (silent — no forum POST)
- Gmail: GitHub notify threads `#547` + `#550` (HiepSVG comments)
- Live tip on last user report: **9.0.1207**
- Couple: `_TZE204_gkfbdvyx`+`TS0601` → `presence_sensor_radar` (ZY-M100-24GV3)
- IEEE: `a4:c1:38:86:ef:fe:6b:3c`

## Latest symptom (2026-09-23 16:45Z)
| Symptom | Root cause found |
|---------|------------------|
| Lux nearly dead / stuck | Cold-stream required lux **AND** distance cold — distance ticking skipped DP103 re-arm |
| Presence hung after leave | Sticky/survival watchdogs gated on floodCalm/relay — ceiling never armed |
| Dead beyond ~3.5m | Homey `detection_range` / sensitivity / delay had **no `setting:` on DP map** → MCU never received range (Z2M#25692 amnesia) |
| Distance flaky | find_switch churn + missing settings restore (same map gap) |

## Fix tip **≥9.0.1210** (P2705 BOTH)
1. Split `_ceilingLuxIsCold` — re-query DP103 when lux alone is cold
2. Wire DP2/4/102/105 → Homey settings (sensitivity / range / entry / departure)
3. Arm sticky + survival for `enableFindSwitchOnBoot` ceiling family
4. Contre quoi: `test/critical/p2705-hiepsvg-550-lux-cold-settings.test.js`

## User action
Update Universal Tuya Test → **≥9.0.1210**, Repair (or remove+re-add) radar, set Detection range ≥6m, watch lux + clear after leave.

## Dual-app
BOTH reliability → master + stable backport when publish asked.
