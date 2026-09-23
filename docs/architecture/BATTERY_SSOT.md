# Battery SSOT (P2269 / P2296 / P2645)

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
| Sleepy remote skip configureReporting | `BaseUnifiedDevice` + `profile.skipBatteryReporting` (P2645) |
| Adaptive SOC/chemistry precision | `lib/battery/SmartBatteryAdaptivePrecision.js` (P2689) |

## Known couples (P2296)

| Couple | Power | Battery UI |
|--------|-------|------------|
| `_TZE200/204_ogkdpgy2`+TS0601 | mains | strip measure/alarm |
| `_TZE200/204_3ejwxpmu`+TS0601 | mains | strip measure/alarm |
| `_TZE200_68nvbio9` / `68nvbi09` / `cf1sl3tj`+TS0601 | battery (DP13) | keep `measure_battery` only; no MCU 0x10 spam |
| `_TZ3000_mrpevh8p`+TS0041 | battery CR2032 | keep `measure_battery` (P2294 sleepy lock) |
| TS004x `button_wireless_*` | battery SED | keep cap + **skip** pair configureReporting (P2645); rehydrate P2488/P2490 |

## Sleepy remotes — Skip ≠ strip (P2645)

Complementary layers (see [`SLEEPY_REMOTE_PAIRING_SSOT.md`](./SLEEPY_REMOTE_PAIRING_SSOT.md)):

| Do | Do not |
|----|--------|
| Skip `configureReporting` / `getOnStart` on button/sleepy drivers | Strip `measure_battery` from `button_*` (P2488) |
| Accept passive % reports when SED wakes | Linear `(V-2.5)/0.5` |
| Quiet Time `0x000A` L0 spam | Blame user-only without code skipBattCfg |

## P2689 — Adaptive precision (piles / accus / mesh calm)

Machine: [`lib/battery/SmartBatteryAdaptivePrecision.js`](../../lib/battery/SmartBatteryAdaptivePrecision.js)  
Gate: `npm run check:p2689`  
Classify: **BOTH** (reliability)

Inspired by Z2M (awake-only configure, long minInterval), ZHA (no power bind on coin remotes), HomeSuite (jitter / no stampede), community last-seen doctrine:

| SOC band | minChange | throttle | Poll scale (non-SED only) |
|----------|-----------|----------|---------------------------|
| critical ≤15% | 1% | 60s | 0.5× |
| low ≤30% | 1% | 120s | 0.7× |
| mid ≤70% | 2% | 5 min | 1× |
| high ≤100% | 5% | 10 min | 1.5× |

- **Coin (CR2032/CR2450…)** on buttons: never proactive poll; passive + optional stale piggyback on press.
- **Accus (Li-ion…)** : slightly tighter maxInterval when low (SOC swings under load).
- **Mains phantom**: park reporting (MeshFloodCalm disable).
- Dual-signal fuse: flat ZCL 100% + low voltage → prefer voltage curve (no linear V formula).

## LEGACY (do not extend)

- `BatteryManagerV3` / `BatteryManagerV4`
- `BatteryMasterEngine` — soft-require only; path to `LowLevelBridge` is `../LowLevelBridge`

## Banned

Linear formulas like `(voltage - 2.5) / 0.5`. Use profiles (`3V_2100`, `1.5V_AA`, …).

## Contre quoi

Blind ZCL `/2` → 100% reports as 50% (forum SOS / Tuya 0–100). Gate: battery intelligence / P216 notes in `.cursorrules`.
MCU `mcuVersionRequest` loops on Zemismart battery covers → pack drain (Z2M #28655).
Battery configureReporting storm on sleepy remotes → mute buttons (P2645 / Bastien `4d4e1684`). Gate: `npm run check:p2645`.
