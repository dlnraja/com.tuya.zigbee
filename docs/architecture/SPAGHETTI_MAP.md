# Lib spaghetti map (P2269 / P2270)

Why the codebase looks stacked: Homey SDK gaps + Tuya OEM chaos + dual-app soak. Prefer SSOT entry points over new god classes.

## SSOT entry points

| Concern | Use | Avoid |
|---------|-----|-------|
| Capability write | `safeSetCapabilityValue` on `TuyaZigbeeDevice` | raw `setCapabilityValue` |
| Device I/O | `DeviceIOFacade` / `installDeviceIO` | per-driver raw cluster hacks |
| Fusion (battery/button/SOS/scene) | `DeviceFusionHooks` (attached to facade) | inline god-file methods |
| Path catalog / rank | `PROTOCOL_PATHS` + `CommunicationPathFinder` | new cascade copy |
| Protocol ZCL↔EF00 | `IntelligentProtocolDetect` | forked `_detectProtocol` |
| DP scale | `SmartDivisorManager` | hardcoded `/100` twice |
| Battery | `BatteryRouter` → `UnifiedBatteryHandler` | linear `(V-2.5)/0.5`, Battery V3/V4 |
| Time MCU | `TuyaTimeSyncFormats` + `GlobalTimeSyncEngine` | single hardcoded format |
| Clusters names/ids | `ZclClusterLexicon` | guessing from retail SKU |

## Historical layers (git archaeology)

| Patch | Introduced | Lesson |
|-------|------------|--------|
| P34 | `LowLevelBridge` | Bypass Homey limits → now thin→ProtocolFallbackChain |
| P35 | BatteryMasterEngine | Prefer BatteryRouter entry |
| P102 | DeviceIOFacade | Unified I/O surface |
| P107/P120 | SmartDivisor + double-division gate | Never double-scale |
| P208 | ProtocolRxTxChain | Path function table |
| P214 | IntelligentProtocolDetect | Sacred before EF00 |
| P2267 | E002 taxonomy | Z2M manuSpecificTuya2 = 0xE002 |
| P2268–P2273 | Parallel harvest | Lock mfr+pid only |
| P2274–P2277 | Unsteals | Nous strip, curtain invert, smoke/3ph, thermostats |
| P2278 | TRV ogx8u5z6 | me167 + DP47 cal ÷10 TX/RX (`temperature_calibration`) |
| P2279 | Cover + USB | `1fuxihti`→curtain; `mvtclclq` DS-1450WN DP1–4; strip dimmer steal |
| P2269 | Anti-spaghetti SSOT + DeviceFusionHooks | Prefer SSOT docs / quarantine dead parsers |

## God classes (do not rewrite casually)

- `UnifiedSensorBase` / `BaseUnifiedDevice` (~4k LOC) — extract helpers only
- `TuyaZigbeeDevice` — keep orchestrator; comment headers OK
- `DeviceIOFacade` — fusion/exotic extracted to `DeviceFusionHooks.js`; keep `installDeviceIO` API

SSOT docs: PROTOCOL_TX_RX / BATTERY / TIME_SYNC / PARSER · archaeology: `reports/anti-spaghetti-2026-08-26/ARCHITECTURE_HISTORY.md`.

See also: `docs/architecture/COMM_PATHFINDING.md`, `reports/discussion-harvest-2026-08-26/`.
