# Battery SSOT (P2269)

## Entry points (use these)

| Role | Module |
|------|--------|
| Route source (ZCL vs DP vs voltage) | `lib/helpers/BatteryRouter.js` |
| Non-linear % + profiles | `lib/battery/UnifiedBatteryHandler.js` |
| ZCL percent normalize (no blind `/2`) | `lib/battery/zcl-percent.js` / `normalizeZclBatteryPercent` |
| Facade fuse | `DeviceIOFacade` `fuseBattery` |

## LEGACY (do not extend)

- `BatteryManagerV3` / `BatteryManagerV4`
- `BatteryMasterEngine` — soft-require only; path to `LowLevelBridge` is `../LowLevelBridge`

## Banned

Linear formulas like `(voltage - 2.5) / 0.5`. Use profiles (`3V_2100`, `1.5V_AA`, …).

## Contre quoi

Blind ZCL `/2` → 100% reports as 50% (forum SOS / Tuya 0–100). Gate: battery intelligence / P216 notes in `.cursorrules`.
