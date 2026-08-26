# Lib spaghetti map (P2269 / P2270)

Why the codebase looks stacked: Homey SDK gaps + Tuya OEM chaos + dual-app soak. Prefer SSOT entry points over new god classes.

## SSOT entry points

| Concern | Use | Avoid |
|---------|-----|-------|
| Capability write | `safeSetCapabilityValue` on `TuyaZigbeeDevice` | raw `setCapabilityValue` |
| Device I/O | `DeviceIOFacade` / `installDeviceIO` | per-driver raw cluster hacks |
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
| P2268–P2270 | Parallel harvest | Lock mfr+pid only |

## God classes (do not rewrite casually)

- `UnifiedSensorBase` / `BaseUnifiedDevice` (~4k LOC) — extract helpers only
- `TuyaZigbeeDevice` — keep orchestrator; comment headers OK
- `DeviceIOFacade` — split internals later; keep `installDeviceIO` API

See also: `docs/architecture/COMM_PATHFINDING.md`, `reports/discussion-harvest-2026-08-26/`.
