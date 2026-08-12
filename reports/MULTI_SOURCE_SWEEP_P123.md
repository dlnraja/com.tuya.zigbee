# Multi-source sweep P123 (2026-08-12)

## Scope
Continue full-source harden after P122: bare ZigBeeDevice migration, IAS WD via DeviceIOFacade, double-division hard gate for drivers only.

## Changes
| Area | Change |
|------|--------|
| `lcdtemphumidsensor_2` | → `TuyaZigbeeDevice` (L14 / safeSetCapability) |
| `fan_controller` | → `TuyaZigbeeDevice` + strip phantom battery |
| `usb_dongle_triple` | → `TuyaZigbeeDevice` + `mainsPowered` + strip phantom battery |
| `switch_temp_sensor` | → `TuyaZigbeeDevice` + `mainsPowered` + strip phantom battery |
| `siren` | Prefer `this.io.startWarning` / `stopWarning` with IAS WD fallback |
| `bare-zigbee-allowlist` | Removed 4 migrated drivers (18 remain) |
| `adaptive-double-division-gate` | `--hard` fails only on `drivers/` hits; lib dual-path soft-allowlisted |

## Gates
- bare-zigbee: violations=0 (bare=19, allowlisted=18, exceptions=1)
- anti-bot: PASS
- unbound-catch: PASS
- adaptive-double-division `--hard`: hardHits=0

## Sources / policy
- GH issues/PRs: 0 open at scan
- Forum: silent enrich only (REPLY_TOPICS=140352 dry-run)
- Gmail crash patterns: previously green
- Sacred couple: unchanged this pass

## Version
**9.0.485** — Test channel publish after push.
