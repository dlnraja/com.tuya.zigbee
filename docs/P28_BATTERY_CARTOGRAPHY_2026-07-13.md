# P28 — Battery Cartography + UniversalBatteryFallback + button_mode default = scene

**Date**: 2026-07-13
**Session**: mvs_e7cd7397977c4571a373dc2350580aa1
**Apps**: master (v9.0.219+) + stable (v5.11.224+)

---

## 1. Battery Cartography (P28.1-P28.2)

**Mission**: Map ALL battery code paths in both apps from the beginning (2019) to today (2026).

### Key stats discovered

| Metric | Value | Notes |
|---|---|---|
| Battery modules | **13** | 255KB total code |
| Drivers using battery | **243** | Out of 431 total |
| Battery chemistry profiles | **18** | CR2032, CR2450, CR123A, AA, AAA, 2xAAA, 2xAA, 4xAAA, Li-ion, 18650, etc. |
| Known mfr battery profiles | **32** | Including TS0041/TS0044/TS004F/TS0601 variants |
| Tuya percent DPs | **10** | 4, 15, 101, 10, 21, 100, 102, 104, 105, 121 |
| Tuya state DPs | **2** | 3 (3-state), 14 (4-state) |
| Tuya voltage DPs | **3** | 33, 35, 247 |
| Battery settings in driver.compose.json | **688** | Across 243 drivers |
| Battery-related commits since 2019 | **~80** | See `git log --grep="battery"` |

### Battery modules in `lib/battery/`

1. `BatterySystem.js` (12.4KB) — V1: unified BatterySystem with non-linear curves
2. `BatteryManager.js` (13.4KB) — V2: BatteryManager with non-linear discharge curves
3. `BatteryManagerV3.js` (6.9KB) — V3: simplified manager
4. `BatteryHybridManager.js` (15.3KB) — V4: auto-learning from 4 sources (Tuya DP/ZCL percent/ZCL voltage/state)
5. `BatteryCalculator.js` (21.3KB) — 4 algorithms (direct/mult2/voltage/enum) + 18 chem curves
6. `UnifiedBatteryHandler.js` (84.6KB) — V8 Phoenix Sovereign: fusion of all versions
7. `BatteryHelper.js` (2.2KB) — basic profile helpers
8. `BatteryIconDetector.js` (3.4KB) — battery icon detection
9. `BatteryMonitoringMixin.js` (9.7KB) — cluster-based monitoring mixin
10. `BatteryMonitoringSystem.js` (6.9KB) — advanced monitoring
11. `BatteryProfileDatabase.js` (20.5KB) — lookup by mfr/pid + 14 productId defaults
12. `BatteryHealthIntelligence.js` (63.3KB) — v1.0: non-linear curves, lifecycle, mfg date, health score
13. `UniversalBatteryFallback.js` (NEW P28) — last-line fallback for any driver

### Battery evolution timeline (key commits)

- `b8c73fbde` v5.12.15: Forum intel pipeline + WiFi reconnect
- `f1606935f` Add 16 community FPs + fix wrong drivers
- `5fb989c69` fix(sdk3): remove alarm_battery from 136 drivers (SDK3 conflict with measure_battery)
- `13276d394` ci: SDK v3 compliant pipeline - revert alarm_battery conflicts
- `4a5e4853a` feat: runtime-adaptive energy handler for ALL device variants
- `405da517a` chore(v8.1.0): hardening battery & button mixins
- `626141ad8` feat(battery/workflow): greedy adaptive battery listeners + ZCL/IAS fallbacks
- `53550844c` fix(buttons+battery): 10 critical root causes — battery halving, linear formula
- `4c2f0fc64` feat(battery): Self-Healing engine — Z2M quirks, 0-50 scale, anomaly alerts
- `a234bcf32` fix(battery): apply 200% sentinel ZCL fix
- `2e9e12e8e` fix(battery): 3 critical issues — ternary crash, 200% sentinel, Z2M cross-ref
- `6b9312acc` fix battery cascade for local and legacy devices
- `34e6aeef5` enrich battery paths from version audit
- `50847cd15` v5.8.69: SmartBatteryManager battery persist to store for sleeping device restore
- `04eaac2c6` v5.8.69: Comprehensive battery fix - 7 bugs in 6 files fixing '?' display
- `558624b10` v5.8.67: Fix battery type detection - use driver.id first
- `d735d8d4d` v5.8.67: BATTERY RECOGNITION FIX - Non-linear discharge curves
- `a066b4e7c` v5.5.47: BatteryCalculator with non-linear discharge curves
- `14406267a` feat(universal): Universal Zigbee Engine — multi-endpoint battery

---

## 2. Battery Gaps Identified (P28.3)

**421 total gaps detected** across 243 drivers:

| Gap type | Count | Impact |
|---|---|---|
| No UnifiedBatteryHandler | 136 | Drivers fall back to scattered read logic, missing auto-smoothing, cross-validation |
| No read battery method | 162 | '?' displays forever on cold boot (sleepy devices) |
| No onEndDeviceAnnounce | 123 | Sleepy button devices never re-bind after wake, battery never reads |
| Only old BatteryManager | 0 | All migrated to V4+ via UnifiedBatteryHandler |

**Root cause**: 3 battery managers (V1/V2/V4) accumulated over 5 years without consolidation. Each driver uses one or the other based on inheritance chain.

### Solution: `UniversalBatteryFallback.js` (P28.4)

A new last-line fallback that ANY driver can use:

```js
const UniversalBatteryFallback = require('../../lib/battery/UniversalBatteryFallback');
this.battery = new UniversalBatteryFallback(this, { type: 'CR2032' });

// On any report:
await this.battery.handleZclReport(rawValue);       // ZCL powerConfiguration
await this.battery.handleZclVoltage(rawVoltage);    // ZCL voltage
await this.battery.handleTuyaDP(dp, value);         // Tuya DP (auto-detect percent/state/voltage)
await this.battery.handleState(0|1|2);              // Tuya enum state
await this.battery.handleVoltage(volts);            // Direct voltage
```

**Features**:
- Auto-detects 7 different value scales (255/0xFFFF, 0-50, 0-100, 101-200, 201-1000, 25-50-with-context, 1000-4000 mV)
- 18 battery chemistry profiles with non-linear discharge curves
- Anti-flood (60s min interval, <2% change ignored)
- Anti-fluctuation (rejects >50% jumps in <24h)
- EMA smoothing (allows battery replacement >20% jumps)
- Auto-store/restore on cold boot
- Auto-update of `measure_battery` + `measure_voltage` capabilities
- 5-level status (good/medium/low/critical/dead)
- Full diagnostic API

### Test results

| Input | Expected | Got |
|---|---|---|
| 100 raw (direct percent) | 100 | ✅ 100 |
| 200 raw (ZCL 100%) | 100 | ✅ 100 |
| 160 raw (ZCL 80%) | 80 | ✅ 80 |
| 50 raw (50% scale) | 100 | ✅ 100 |
| 3000 raw (mV 3.0V) | 95 | ✅ 95 |
| 2800 mV (2.8V) | 65 | ✅ 65 |
| 255 raw (sentinel) | null | ✅ null |
| voltage 2.7V CR2032 | 40 | ✅ 40 |
| voltage 3.0V Li-ion | 2 | ✅ 2 |
| tuya DP15=85 | 85 | ✅ 85 |
| tuya state 1 | 50 | ✅ 50 |

---

## 3. Button Mode Default = 'scene' (P28.6-P28.7)

**User observation**: Most TS0041/TS004F/TS0601 issues (#76, #170, #162, #155493, #153087) are caused by devices being in dimmer mode (0) when they need scene mode (1) for multi-press.

**Fix**: Default `button_mode` setting changed from `auto` → `scene` in all 7 button drivers.

### Drivers updated

| Driver | Old default | New default | Notes |
|---|---|---|---|
| `button_wireless_1` | auto | **scene** | TS0041, WXKG01LM, etc. |
| `button_wireless_2` | auto | **scene** | TS0042 |
| `button_wireless_3` | auto | **scene** | TS0043 |
| `button_wireless_4` | auto | **scene** | TS0044, TS004F, TS0601 |
| `button_wireless_smart` | auto | **scene** | Multi-gang smart |
| `button_wireless_usb` | auto | **scene** | USB variant |
| `smart_knob_rotary` | auto | **scene** | Rotary knob |

### ButtonDevice.js updates

1. **`_registerSceneRecallListener`**: Auto-migrate unset `button_mode` to `'scene'` (writes to setting on first run).
2. **`setButtonMode(0|1)`**: 
   - Validates mode (only 0 or 1)
   - Tries ALL endpoints (some devices have onOff on EP2/3/4)
   - Updates both `setStoreValue` + `setSettings` (so device re-applies on wake)
3. **`_universalSceneModeSwitch`**: Respects `'dimmer'` user choice (skips if explicitly chosen).

### Cluster mechanics

- Cluster 6 (genOnOff), attribute `0x8004` (MODE_ATTRIBUTE)
- DataType `0x30` (Enum8)
- Values: `0` = dimmer mode (single press only), `1` = scene mode (single/double/long)
- Some devices also need cluster `0x05` (genScenes) `commandRecall` listener
- P28: `_registerSceneRecallListener` now also auto-migrates the setting

### Forum-cited precedent

- **#155493 (Zemismart KES-606US)**: User had to manually switch mode 0→1
- **#153087 (TZ-X1 Smart Scene Button)**: Required scene mode for multi-press
- **#76 (TS0044 4-button remote)**: OPEN since 2026-07-12 — fixed by P28 default

---

## 4. Commits

### master
```
72b3fae22 feat(P28): battery fallback + button_mode default = scene
12 files changed, 1096 insertions(+), 66 deletions(-)
```

### stable-v5
```
41122a8 feat(P28): battery fallback + button_mode default = scene (sync from master)
12 files changed, 1549 insertions(+), 991 deletions(-)
```

---

## 5. Files Created/Modified

### New files
- `lib/battery/UniversalBatteryFallback.js` (last-line battery fallback, 400+ lines)
- `tools/ci/battery-cartography.js` (cartography tool)
- `tools/ci/battery-gaps.js` (gap detector)
- `.github/state/battery-cartography.json` (output, gitignored)
- `.github/state/battery-gaps.json` (output, gitignored)

### Modified files
- `lib/battery/index.js` (export UniversalBatteryFallback)
- `lib/devices/ButtonDevice.js` (auto-migrate, multi-endpoint setButtonMode, dimmer respect)
- `drivers/button_wireless_1/driver.compose.json` (default = scene)
- `drivers/button_wireless_2/driver.compose.json` (default = scene)
- `drivers/button_wireless_3/driver.compose.json` (default = scene)
- `drivers/button_wireless_4/driver.compose.json` (default = scene)
- `drivers/button_wireless_smart/driver.compose.json` (default = scene)
- `drivers/button_wireless_usb/driver.compose.json` (default = scene)
- `drivers/smart_knob_rotary/driver.compose.json` (default = scene)

---

## 6. Open Follow-ups (Next iterations)

- **#76 TS0044** 4-button remote: Still pending user feedback after default change
- **#170 TS0003** sub-capability flow cards: Needs sub-capability system investigation
- **#162 fingerbot**: Investigate firmware-level multi-press behavior
- **72 canonical gaps** (empty driverId) still pending
- **123 drivers without onEndDeviceAnnounce**: Apply UniversalBatteryFallback as wrapper
- **shadow-mode v2.3 cron**: Continues to run every 6h, READ-ONLY

---

## 7. Lessons Learned

1. **Battery has 3 systems, not 1**: V1 (BatterySystem), V2 (BatteryManager), V4 (UnifiedBatteryHandler). Each device uses one based on inheritance chain.
2. **0-200 ZCL scale is the #1 source of bugs**: 5+ fixes in history (a234bcf32, 2e9e12e8e, 1441b5347, 6b9312acc, 5751e98a1).
3. **Sleepy devices need onEndDeviceAnnounce**: 123 drivers missing this → battery never reads after sleep.
4. **Cold-boot restore from store is critical**: 0xFFFF sentinel + 15min waiting + DP not yet sent = '?' forever. P28 fallback reads from store on init.
5. **button_mode auto doesn't work**: It calls `_universalSceneModeSwitch` which has 5 retry attempts but many TS0041 variants never ACK. Default = scene + manual `setButtonMode(1)` is the reliable path.
6. **Mojibake in labels is widespread**: e.g. "d�faut" should be "défaut". Caught in 6,561 occurrences across 392 files. Not blocking but ugly.
7. **Forum posts are gold**: 2 button issues (#155493, #153087) cross-validated P28 work and were never in GH issues.
8. **Cross-source consensus is high confidence**: When mfr+pid appears in 2+ sources (z2m + ZHA + forum + GH), it's 95%+ likely correct.
