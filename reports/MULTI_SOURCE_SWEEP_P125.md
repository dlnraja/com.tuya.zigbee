# Multi-source sweep P125 (2026-08-12)

## Trigger
Unified CI failed on **24 NEW FP collisions** after P123/P124 (run 31592564595).

## Collision fixes
| Couple | Fix |
|--------|-----|
| `_TZE200_xu4a5rhj` × climate+curtain | Removed from `climate_sensor` (keep curtain) |
| `_TZE200_lawxy9e2` × climate+fan | Removed from `climate_sensor` (keep ceiling_fan) |
| `2imwyigp` / `n2egfsli` / `oxslv1c9` × `TS0601` on contact | Dropped `TS0601` from `contact_sensor` (TS0203 path; switch owns TS0601 for 2imwyigp) |
| `oxslv1c9` on `socket_power_strip` | Replaced with hybrid placeholder (contact owns oxslv1c9) |

FP gate: **0 new** vs baseline.

## Bare migrates
`device_air_purifier_humidifier`, `dimmer_ts110e`, `radiator_controller` (safe-timers), `double_power_point` → `TuyaZigbeeDevice`. Allowlist **8** left.

## Anti-bot
`p125-xu4a5rhj-not-climate`, `p125-lawxy9e2-not-climate`, `p125-oxslv1c9-not-socket-strip`.

## Version
**9.0.488**
