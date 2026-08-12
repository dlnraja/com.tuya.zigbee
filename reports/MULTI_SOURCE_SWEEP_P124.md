# Multi-source sweep P124 (2026-08-12)

## Sources
- GH issues/PRs: 0 open
- Gmail crash gate: ok (patterns fixed_p100/p101)
- Forum silent: clrdrnya dual-driver collision; FPs otherwise present
- Workflows: shell/timeout hygiene already clean
- Gates: bare/anti-bot/double-division hardHits=0

## Changes
| Area | Change |
|------|--------|
| Power strips ×3 + `double_power_point_2` | → `TuyaZigbeeDevice` + `mainsPowered` |
| `smart_garden_irrigation_control` | → `TuyaZigbeeDevice` + `safeSetTimeout` |
| `lcdtemphumidluxsensor` | → `TuyaZigbeeDevice`; ZCL temp/humidity always `/100` |
| `clrdrnya` | Removed from `motion_sensor_radar_mmwave` (keep `presence_sensor_radar` only) |
| Anti-bot | `p124-clrdrnya-not-mmwave` |
| Allowlist | 12 bare leftovers |

## Version
**9.0.487**
