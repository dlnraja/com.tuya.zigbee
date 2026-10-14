# P2822 — Inbox / GitHub silent treat (2026-10-14)

Silent only (T157628). Dual-app: **BOTH**.

## Open GitHub (treated)

| Issue | Couple / symptom | Action |
|-------|------------------|--------|
| **#560** | `_TZE200_rxq4iti9`+TS0601 TRV — Battery 100%, blank setpoint | **FIX** EF00: ownership + `_isTrvSetpointDpNotBattery` before battery forward; me167 `_resolveMfr` |
| **#550** | `_TZE204_gkfbdvyx`+TS0601 ceiling — lux/distance/phantom | Tip-lag / P2715 already shipped; radar battery forbid still wired |
| **#571 / #570** | Soil QT07S / AOYAN — soft clusters + settings spinner | FP present tip ≥9.0.1468; settings dual ready fallback 800ms+2.5s |
| **#559** | `w0qqde0g` keep | Already sacred-keep (no code change) |

## Contre quoi

- `test/critical/p2822-gh560-me167-dp4-not-battery.test.js`
- `npm run check:p2822`

## Tip

- Universal: **9.0.1469**
- Bastien / Stable: surgical P2822 backport same session
