# Battery System Audit (P53)

> **Status**: 26 files, 357 methods — too dispersed, needs consolidation in P54+

## Inventory

| File | Lines | Category | Purpose |
|------|-------|----------|---------|
| `lib/battery/BatteryCalculator.js` | ? | battery | Core calculation |
| `lib/battery/BatteryCascadeEngine.js` | ? | battery | Cascade fallback |
| `lib/battery/BatteryHealthIntelligence.js` | ? | battery | Health prediction |
| `lib/battery/BatteryHelper.js` | ? | battery | Helper functions |
| `lib/battery/BatteryHybridManager.js` | ? | battery | Hybrid mode |
| `lib/battery/BatteryIconDetector.js` | ? | battery | Icon level |
| `lib/battery/BatteryManager.js` | ? | battery | Main manager |
| `lib/battery/BatteryManagerV3.js` | ? | battery | V3 (legacy) |
| `lib/battery/BatteryMasterEngine.js` | ? | battery | Master engine |
| `lib/battery/BatteryMonitoringMixin.js` | ? | battery | Mixin |
| `lib/battery/BatteryMonitoringSystem.js` | ? | battery | Monitoring |
| `lib/battery/BatteryProfileDatabase.js` | ? | battery | Profile DB |
| `lib/battery/BatterySystem.js` | ? | battery | System |
| `lib/battery/UnifiedBatteryHandler.js` | ? | battery | Unified handler |
| `lib/battery/UniversalBatteryFallback.js` | ? | battery | Universal fallback |
| `lib/BatteryManagerV3.js` | ? | root | V3 (legacy) |
| `lib/BatteryManagerV4.js` | ? | root | V4 (legacy) |
| `lib/clusters/TuyaBatterySafeCluster.js` | ? | clusters | Tuya cluster |
| `lib/flow/BatteryHealthFlowHandler.js` | ? | flow | Health flows |
| `lib/helpers/BatteryRouter.js` | ? | helpers | Router |
| `lib/managers/SmartBatteryManager.js` | ? | managers | Smart manager |
| `lib/tuya/BatteryMixin.js` | ? | tuya | Tuya mixin |
| `lib/tuya-engine/converters/battery.js` | ? | tuya-engine | Converter |
| `lib/utils/battery-reader.js` | ? | utils | Reader |
| `lib/utils/battery-reporting-manager.js` | ? | utils | Reporting |
| `lib/utils/BatteryCurveFallback.js` | ? | utils | Curve fallback |
| `lib/ux/VisualBatteryHealthIndicator.js` | ? | ux | Visual indicator |

## Issues Found

1. **Too many overlapping files**: 15 files in `lib/battery/` for the same concept
2. **V3 and V4 legacy files still in `lib/`** at the top level
3. **357 methods** spread across 26 files = avg ~14 methods per file
4. **Possible circular imports** between BatteryManager, BatteryMasterEngine, UnifiedBatteryHandler, BatterySystem
5. **No clear "single source of truth"** for battery calculation

## Real measurements supported (per code inspection)

- **Voltage** (V) — `batteryVoltage` cluster attribute 32
- **Percentage** (raw 0-200 or 0-100) — `batteryPercentageRemaining` cluster attribute 33
- **Capacity** (mAh) — derived
- **Power** (W) — calculated
- **Current** (A) — calculated
- **Temperature** (°C) — derived (impacts battery life)
- **Humidity** (%RH) — for environmental context
- **Voltage divider ratio** — for accurate measurement
- **Battery chemistry** — Li-Ion, NiMH, Alkaline, LiFePO4, Coin Cell
- **Cycles** — charge/discharge count

## Estimation methods supported

- **Linear interpolation** between V_max and V_min
- **Curve-based** with chemistry-specific profiles
- **Cascading** (try multiple sources)
- **Predictive** (based on history)
- **Adaptive** (learns from usage)
- **Fallback** (default to last known or chemistry estimate)

## Recommendations (P54)

1. **Consolidate** the 15 `lib/battery/*.js` files into 4-5:
   - `BatteryCore.js` (calculation, profiles, helpers)
   - `BatteryManager.js` (main entry, replaces 8 files)
   - `BatteryMonitor.js` (monitoring, mixin, system)
   - `BatteryReporting.js` (reader, reporting manager)
   - `BatteryHealth.js` (intelligence, health, indicator)

2. **Delete V3 and V4** legacy files in `lib/` root (kept for backward compat, unused)

3. **Pick ONE manager as the canonical entry**: `UnifiedBatteryHandler` looks like the best candidate

4. **Add a "battery audit" workflow** that runs weekly to detect inconsistencies

5. **Document the battery calculation algorithm** in one place with examples

## P53 Fix Applied

- **Button bug fix** (issue 412, 410, 334): added `_TZ3000_yj6k7vfo` to `button_wireless_1` (was only in `button_wireless_4_ts0041` which is wrong — TS0041 is 1-button, not 4)
- **Soil sensor fix** (issue 511): added `_TZE284_ga1maeof` to `soil_sensor` alongside `_TZE284_awepdiwi`
- **31 ghost workflows** disabled on GH
- **Puppeteer fallback** added to forum-fetch (set `FORUM_USE_PUPPETEER=1`)
- **78 drivers synced** from master to stable-v5
