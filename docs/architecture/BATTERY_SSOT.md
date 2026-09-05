# Battery SSOT (P2269 / P2296)

## Homey SDK (official)

Source: [Battery status](https://apps.developer.homey.app/the-basics/devices/best-practices/battery-status)

1. Use **either** `measure_battery` (0–100%) **or** `alarm_battery` (low flag) — **never both** (duplicate UI + Flow cards).
2. If either capability is present (except home batteries / EVs), declare `energy.batteries: [...]`.
3. Mains devices must not keep battery capabilities at runtime.

## Entry points (use these)

| Role | Module |
|------|--------|
| Route source (ZCL vs DP vs voltage) | `lib/helpers/BatteryRouter.js` |
| Non-linear % + profiles | `lib/battery/UnifiedBatteryHandler.js` |
| ZCL percent normalize (no blind `/2`) | `lib/battery/zcl-percent.js` / `normalizeZclBatteryPercent` |
| Runtime XOR + mains strip | `lib/SDK3BestPractices.ensureBatteryBestPractices` |
| Cover/CO2 power-source couples | `lib/helpers/batteryPowerSource.js` |
| Facade fuse | `DeviceIOFacade` `fuseBattery` |

## Known couples (P2296)

| Couple | Power | Battery UI |
|--------|-------|------------|
| `_TZE200/204_ogkdpgy2`+TS0601 | mains | strip measure/alarm |
| `_TZE200/204_3ejwxpmu`+TS0601 | mains | strip measure/alarm |
| `_TZE200_68nvbio9` / `68nvbi09` / `cf1sl3tj`+TS0601 | battery (DP13) | keep `measure_battery` only; no MCU 0x10 spam |
| `_TZ3000_mrpevh8p`+TS0041 | battery CR2032 | keep `measure_battery` (P2294 sleepy lock) |

## LEGACY (do not extend)

- `BatteryManagerV3` / `BatteryManagerV4`
- `BatteryMasterEngine` — soft-require only; path to `LowLevelBridge` is `../LowLevelBridge`

## Banned

Linear formulas like `(voltage - 2.5) / 0.5`. Use profiles (`3V_2100`, `1.5V_AA`, …).

## Contre quoi

Blind ZCL `/2` → 100% reports as 50% (forum SOS / Tuya 0–100). Gate: battery intelligence / P216 notes in `.cursorrules`.
MCU `mcuVersionRequest` loops on Zemismart battery covers → pack drain (Z2M #28655).
