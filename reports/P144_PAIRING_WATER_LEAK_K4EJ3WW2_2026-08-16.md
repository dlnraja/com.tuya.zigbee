# P144 — Pairing conflict fix + water-leak timer harden (2026-08-16)

## Verdict
Canonical sacred couple `_TZ3000_k4ej3ww2` + `TS0207` is **IAS water leak only** (`water_leak_sensor`). Dual claim on `water_leak_sensor_tuya` removed.

## Evidence
- Z2M / community: `_TZ3000_k4ej3ww2` + `TS0207` = Aubess IH-K665 / HOBEIAN ZG-222ZA style **IAS** water leak (clusters 0,1,3,1280) — not Tuya EF00-primary.
- Prior P143 put the mfr on `water_leak_sensor` but left the same mfr (and a bogus productId `_tz3000_k4ej3ww2`) on `water_leak_sensor_tuya` → Homey pairing collision / duplicate risk.

## Changes
| Area | Action |
|------|--------|
| `water_leak_sensor_tuya` compose | Removed all `k4ej3ww2` mfr + productId variants |
| `water_leak_sensor` compose | Ensured case variants + `TS0207` |
| `water_leak_sensor_tuya` device.js | Battery poll → `safeSetInterval`; clear on delete/uninit |
| Deprecated `air_purifier_*` | Restored sentinel mfrs emptied by auto-fix; drop bad `quickAction: onoff` when no onoff |
| `.github/CONTRIBUTING.md` | Sacred Couple, dual-app, forum-silent, button/energy/timer rules |

## Peter / SOS
Crash-class SOS timer fixes already on tip (`button_emergency_sos` + safe-timers). Gmail crash gate: **verdict ok**. User should update Homey Test (≥9.0.536+) and Repair the SOS device if still mute; polarity Invert if needed. No new crash pattern in Gmail.

## Out of scope this pass (deferred, not abandoned)
- Full cross-app button rewrite / mega energy refactor (existing VirtualButtonMixin 300ms antispam + BatteryMasterEngine anti-flood already present).
- Forum posts / CONTRIBUTING “community roadmap” Discourse paste — **silent only** (T157628).
- Wholesale parent/Johan branch archaeology — continue incrementally via sacred-couple + forum silent scan.

## Retest
1. Pair `_TZ3000_k4ej3ww2` + `TS0207` → must land on **Water Leak Sensor** (IAS), not Tuya DP variant.
2. Wet probe → `alarm_water`; battery reporting may stay sleepy until status change (known OEM quirk).
3. Confirm deprecated Air Purifier hybrids do not appear as useful pairing targets.
