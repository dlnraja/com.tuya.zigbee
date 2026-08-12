# Multi-source sweep P126 (2026-08-12)

## Trigger
Unified CI P125 still red: Flow Card Integrity Watchdog on `boiler_switch_energy`.

## Fixes
| Area | Change |
|------|--------|
| `boiler_switch_energy/driver.js` | Register condition/action `registerRunListener`s |
| `_TZE204_iadro9bf` | Removed from `climate_sensor` (keep `presence_sensor_radar`) |
| `device_air_purifier_din` | → `TuyaZigbeeDevice`; fix energy `/divisor` (was multiplying) |
| `curtain_module` | → `TuyaZigbeeDevice` + `safe-timers` |
| Anti-bot | `p126-iadro9bf-not-climate`, `p126-iadro9bf-presence`, `p126-contact-no-TS0601` |
| Allowlist | 6 bare leftovers |

## Gates
bare / anti-bot / FP 0 new / gmail ok

## Version
**9.0.489** (or remote+1)
