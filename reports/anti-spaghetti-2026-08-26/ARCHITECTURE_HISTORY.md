# Architecture history — anti-spaghetti archaeology (P2269)

Date: 2026-08-26 · Mode: SHADOW

## Why the stack looks “spaghetti”

Homey SDK interview gaps + Tuya OEM DP chaos + dual-app soak produced parallel engines (battery V3/V4/Master, multiple time-sync, LowLevelBridge vs ProtocolFallbackChain). Cleanup = **SSOT entry points + shims**, not rewrite of `UnifiedSensorBase` / `TuyaZigbeeDevice`.

## Landmark commits / patches

| Patch | Theme | Lesson |
|-------|--------|--------|
| P34 | `LowLevelBridge` | Bypass Homey limits → thin toward ProtocolFallbackChain |
| P35 | BatteryMasterEngine | Prefer BatteryRouter → UnifiedBatteryHandler |
| P102 | DeviceIOFacade | Unified I/O surface |
| P107 / P120 | SmartDivisor + double-division gate | Never double-scale |
| P208 | ProtocolRxTxChain | Path function table |
| P214 | IntelligentProtocolDetect | Sacred zcl_only before EF00 |
| P2267 | E002 taxonomy | Z2M manuSpecificTuya2 = 0xE002 |
| P2268–P2273 | Parallel harvest | Lock mfr+pid only; unsteal misroutes |

## SSOT map docs

- [SPAGHETTI_MAP.md](../architecture/SPAGHETTI_MAP.md)
- [PROTOCOL_TX_RX_SSOT.md](../architecture/PROTOCOL_TX_RX_SSOT.md)
- [BATTERY_SSOT.md](../architecture/BATTERY_SSOT.md)
- [TIME_SYNC_SSOT.md](../architecture/TIME_SYNC_SSOT.md)
- [PARSER_SSOT.md](../architecture/PARSER_SSOT.md)
- [COMM_PATHFINDING.md](../architecture/COMM_PATHFINDING.md)

## Harvest

`reports/discussion-harvest-2026-08-26/` (≥50 discoveries).
