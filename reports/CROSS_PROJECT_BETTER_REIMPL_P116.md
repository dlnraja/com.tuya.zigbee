# P116 — Cross-project better reimplementation

Date: 2026-08-11 · Version: 9.0.476

## Principle

Study Z2M / ZHA / Johan / quirk table — **reimplement Homey-local**, never paste converters.
Sacred couple + L14 + SmartBattery + DeviceIO remain the source of truth.

## What landed

| External pattern | Better Homey reimpl |
|------------------|---------------------|
| Z2M `battery_dps` / voltage DPs | `ProtocolQuirkLookup` → `SmartBatteryManager.handleDP` (non-linear profiles, no fake %) |
| ZHA/Z2M IAS WD 0x0502 | `DeviceIOFacade.ensureIasWd` / `startWarning` / `stopWarning` (SDK → ZCM → raw → DP) |
| Forum ×660 kWh / wrong divisor | `EnergyJumpGuard` also on `BaseUnifiedDevice.safeSetCapabilityValue` |
| Sleepy remotes wake battery | `PhysicalButtonMixin.onEndDeviceAnnounce` store+ZCL+quirk DP query |
| CI armor | `tools/ci/cross-project-better-reimpl.js` + orchestrator phase `10b` |

## Commands

```bash
npm run check:cross-project-reimpl
node tools/ci/device-io-facade-smoke.js
```
