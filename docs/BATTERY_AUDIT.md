# Battery System Audit (P53/P54)

> **Status**: 28 files, ~700 methods — too dispersed, consolidation in progress
> **Updated**: 2026-07-14 (P54 audit phase + index.js cleanup)

## P54 Import Graph Findings (tools/ci/battery-graph2.js)

Of 28 battery files scanned, **9 are TRULY NEVER IMPORTED** (dead code, safe to delete).
5 more have **only self-imports** (circular dependency, code smell).

### TRULY DEAD files (0 importers, safe to delete)
| File | Size | Methods | Status |
|------|------|---------|--------|
| `lib/BatteryManagerV3.js` | 427 B | 0 | DEAD (root-level, never imported) |
| `lib/battery/BatteryCascadeEngine.js` | 37552 B | 79 | DEAD |
| `lib/battery/BatteryHelper.js` | 2198 B | 9 | DEAD |
| `lib/battery/BatteryIconDetector.js` | 3393 B | 5 | DEAD |
| `lib/battery/BatteryManagerV3.js` | 6849 B | 20 | DEAD (legacy V3 in lib/battery/) |
| `lib/battery/BatteryMonitoringMixin.js` | 9455 B | 19 | DEAD (but imports BatteryCalculator) |
| `lib/battery/BatteryMonitoringSystem.js` | 6902 B | 21 | DEAD |
| `lib/battery/BatterySystem.js` | 12355 B | 30 | DEAD |
| `lib/tuya/BatteryMixin.js` | ? | ? | DEAD |

**Total dead code: ~80KB, ~183 methods** (conservative estimate).

### SUSPECT files (only self-imports, code smell)
| File | Importer | Notes |
|------|----------|-------|
| `lib/battery/UniversalBatteryFallback.js` | itself | Circular dep, refactor needed |
| `lib/clusters/TuyaBatterySafeCluster.js` | itself | Circular dep, refactor needed |

### ACTIVE files (real importers)
| File | Size | Importers | Notes |
|------|------|-----------|-------|
| `lib/battery/UnifiedBatteryHandler.js` | 76K / 1789 lines | 14 (8 lib + 6 drivers) | **MAIN** entry point |
| `lib/battery/BatteryCalculator.js` | 14K | 6 (index, TuyaUnifiedDevice, BatteryMonitoringMixin, drivers) | Core voltage→% |
| `lib/battery/BatteryHybridManager.js` | 14K | 3 (index, TuyaDeviceMixin, BatteryMixin) | Hybrid mode |
| `lib/battery/BatteryMasterEngine.js` | 62K | 2 (SDK3CompatBridge, index) | SDK3 compat |
| `lib/battery/BatteryManager.js` | 13K | 2 (index, BaseUnifiedDevice) | Manager |
| `lib/battery/BatteryHealthIntelligence.js` | 55K | 1 (UnifiedBatteryHandler) | Health (imported via try/catch) |
| `lib/battery/BatteryProfileDatabase.js` | 17K | 1 (BatteryHybridManager) | Profile DB |
| `lib/battery/index.js` | 1K | 2 (UnifiedSensorBase, lib/index) | Re-exports (P54 cleaned) |
| `lib/BatteryManagerV4.js` | 22K | 1 (BatteryManagerV3 - circular) | V4 (legacy) |
| `lib/flow/BatteryHealthFlowHandler.js` | ? | 2 (UnifiedBatteryHandler, FlowCardManager) | Flow cards |
| `lib/helpers/BatteryRouter.js` | ? | 1 (BaseUnifiedDevice) | Routing |
| `lib/managers/SmartBatteryManager.js` | ? | 2 (managers/index, TuyaZigbeeDevice) | Smart management |
| `lib/tuya-engine/converters/battery.js` | ? | 2 (itself, tuya-engine/converters/index) | Tuya converter (self-import circular) |
| `lib/utils/battery-reader.js` | ? | 2 (SmartDriverAdaptation, data-collector) | Reader |
| `lib/utils/battery-reporting-manager.js` | ? | 1 (BaseUnifiedDevice) | Reporting |
| `lib/ux/VisualBatteryHealthIndicator.js` | ? | 1 (ux/index) | Visual indicator |
| `lib/utils/BatteryCurveFallback.js` | ? | 1 (battery/index) | Curve fallback (re-exported) |

## P54 Phase 1 Work (DONE in this session)

1. **Added @deprecated JSDoc** to 14 battery files (covers all dead + 5 marked-but-used for safety)
   - Tool: `tools/ci/mark-battery-deprecated.js`
2. **Cleaned `lib/battery/index.js`**: removed re-exports of 10 dead files
   - Now only 6 active exports: BatteryCalculator, BatteryCurveFallback, BatteryHybridManager, BatteryManager, BatteryMasterEngine, UnifiedBatteryHandler
3. **Created audit tools**:
   - `tools/ci/battery-graph2.js` (import graph, fixed to scan battery files too)
   - `tools/ci/battery-summary.js`
   - `tools/ci/find-battery-name-uses.js`
   - `tools/ci/find-battery-index-imports.js`
   - `tools/ci/mark-battery-deprecated.js`

## P54 Phase 2 Plan (TODO next session)

1. **Delete the 9 truly dead files** (after another import re-check):
   - BatteryCascadeEngine, BatteryHelper, BatteryIconDetector, BatteryManagerV3 (both copies), BatteryMonitoringMixin, BatteryMonitoringSystem, BatterySystem, lib/tuya/BatteryMixin
2. **Fix circular dependencies** in:
   - UniversalBatteryFallback (self-import)
   - TuyaBatterySafeCluster (self-import)
3. **Split UnifiedBatteryHandler.js** (76K, 1789 lines, 241 methods) into:
   - `BatteryCore.js` (~20K): calculation, profiles
   - `BatteryManager.js` (~30K): main entry, replaces 8 files
   - `BatteryMonitor.js` (~10K): monitoring
   - `BatteryReporting.js` (~10K): reader, reporting
   - `BatteryHealth.js` (~10K): intelligence, indicator

## P54 Phase 3 Plan (TODO later)

1. Document the battery calculation algorithm in one place with examples
2. Add weekly "battery audit" workflow (cron)
3. Update AGENTS.md with "battery system" section

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

- **Linear interpolation** between V_max and V_min (deprecated, banned in v8)
- **Curve-based** with chemistry-specific profiles
- **Cascading** (try multiple sources)
- **Predictive** (based on history)
- **Adaptive** (learns from usage)
- **Fallback** (default to last known or chemistry estimate)

## P53 Fix History

- **Button bug fix** (issue 412, 410, 334): added `_TZ3000_yj6k7vfo` to `button_wireless_1`
- **Soil sensor fix** (issue 511): added `_TZE284_ga1maeof` to `soilsensor`
- **31 ghost workflows** disabled on GH
- **Puppeteer fallback** added to forum-fetch
- **78 drivers synced** from master to stable-v5
- **678 missing Tuya FPs** added to generic_tuya (issue 439)
- **fp-collision check** case-SENSITIVE (was reporting 3,274 false positives)
- **Puppeteer + browser UA** for forum-fetch
- **Parallel mega-crawler** (4 workers)
- **Diff-cache + concurrent-fetch** for 4 timeout scanners (P53.5)
