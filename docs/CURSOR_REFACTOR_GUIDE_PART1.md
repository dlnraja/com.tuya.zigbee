# 🎯 CURSOR REFACTOR MEGA-CHECKLIST - PART 1

**Repository:** dlnraja/com.tuya.zigbee
**App:** Universal Tuya Zigbee (com.dlnraja.tuya.zigbee)
**Target:** v4.9.x → V5 "Ultra DP System"
**Status:** Production Stabilization Phase

---

## HIGH-LEVEL GOAL

Stabilize and align the new "Ultra DP System V4" (Smart-Adapt, TuyaDPDatabase, TuyaDPMapper, TuyaDPDiscovery, BatteryManagerV4, TuyaTimeSyncManager) with existing drivers, and fix regressions compared to 4.1.11.

### Key Regressions to Fix:
- ✅ Wireless/USB buttons show as "switch" instead of battery remotes
- ✅ Battery percentage not visible in UI
- ✅ TS0601 Climate: temp/humidity/battery not reported (dataQuery errors)
- ✅ TS0601 Soil: temp/soil_humidity capabilities null
- ✅ TS0601 Radar: missing luminance & PIR behavior

---

## GENERAL RULES

- **DO NOT** destroy Ultra DP System architecture
- **KEEP:** Smart-Adapt, DP tools, BatteryManagerV4, DB, time sync
- **FIX:** wiring between core and drivers + capability definitions
- Prefer minimal, targeted code changes per driver
- Keep logs, avoid noise in production
- Write code/comments in English first
- Avoid breaking driver ID or capability ID renames

---

## BEFORE ANY CHANGE

```bash
# Create dedicated branch
git checkout -b feature/v5-audit-v2-fixes

# Tag current state
git tag v5.0.0-pre-cursor-refactor

# Verify clean state
git status
```

---

## 📋 PHASE 1: FIX WIRELESS REMOTES (TS0041/43/44, USB)

**Goal:** All TS004x/USB switches = battery remotes, NOT controllable switches. No onoff/dim.

### 1.1 Identify Wireless Button Drivers

**Search patterns:**
```bash
# Find all wireless/button drivers
find drivers -name "*wireless*" -o -name "*button*" -o -name "*remote*" | grep -v node_modules

# Find TS004x references
grep -r "TS0041\|TS0043\|TS0044" drivers/*/driver.compose.json

# Find potential wrong classes
grep -r '"class".*"socket"' drivers/button_*/driver.compose.json
grep -r '"class".*"light"' drivers/button_*/driver.compose.json
grep -r '"onoff"' drivers/button_*/driver.compose.json
```

### 1.2 Fix Each Driver

**Files to check per driver:**
- `driver.compose.json`
- `device.js`
- Settings if custom

**Required changes:**

```json
// ❌ BEFORE (WRONG)
{
  "name": {"en": "Wireless Switch 1-gang"},
  "class": "socket",  // ← WRONG!
  "capabilities": [
    "onoff",           // ← REMOVE!
    "dim",            // ← REMOVE!
    "measure_battery"
  ]
}

// ✅ AFTER (CORRECT)
{
  "name": {"en": "Wireless Button (TS0041)"},
  "class": "button",  // ← CORRECT!
  "capabilities": [
    "measure_battery",
    "alarm_battery"
  ],
  "energy": {
    "batteries": ["CR2032"]
  }
}
```

### 1.3 Drivers to Fix (Priority List)

| Driver | Current Class | Action Required |
|--------|---------------|-----------------|
| `button_ts0041` | ✅ button | Already correct |
| `button_ts0043` | ✅ button | Already correct |
| `button_ts0044` | ✅ button | Already correct |
| `button_wireless_1` | ❓ Check | Verify class |
| `button_wireless_3` | ❓ Check | Verify class |
| `button_wireless_4` | ❓ Check | Verify class |
| `switch_wireless_1gang` | ❌ socket | **FIX!** |
| `button_wireless` | ❓ Check | Verify class |

### 1.4 Smart-Adapt Alignment

**File:** `lib/SmartAdaptManager.js`

Ensure button detection logic is correct:

```javascript
// In analyzeDevice() or similar
detectDeviceType(device) {
  const name = device.driver?.id || '';
  const productId = device.getData()?.productId;

  // Button/Remote detection
  if (
    name.includes('button') ||
    name.includes('wireless') ||
    name.includes('remote') ||
    productId?.match(/TS004[134]/)
  ) {
    return {
      type: 'button',
      expectedCapabilities: ['measure_battery', 'alarm_battery'],
      forbiddenCapabilities: ['onoff', 'dim', 'measure_power']
    };
  }
  // ... other types
}
```

### 1.5 Remove Dynamic Fixes

If Smart-Adapt currently **removes** onoff/dim dynamically, we should:
1. Fix the source (driver.compose.json)
2. Remove the dynamic fix code
3. Keep only detection/logging

---

## 📋 PHASE 2: BATTERY PIPELINE CONSISTENCY

**Goal:** All battery devices use BatteryManagerV4 + push values to Homey capabilities.

### 2.1 Check BatteryManagerV4 Integration

**File:** `lib/BatteryManagerV4.js`

✅ Already fixed in Vague 1:
```javascript
async updateBattery(value, source) {
  // ... validation ...

  // ✅ ALWAYS update capability
  if (this.device.hasCapability('measure_battery')) {
    await this.device.setCapabilityValue('measure_battery', rounded);
    this.device.log(`[BATTERY-V4] ✅ measure_battery updated to ${rounded}%`);
  }

  if (this.device.hasCapability('alarm_battery')) {
    await this.device.setCapabilityValue('alarm_battery', isLow);
  }
}
```

### 2.2 Verify All Drivers Using Battery

**Search command:**
```bash
grep -r "BatteryManagerV4" drivers/*/device.js
grep -r "new BatteryManager" drivers/*/device.js
```

**Check each match:**
- [ ] `startMonitoring()` is called
- [ ] No internal-only value storage
- [ ] Capabilities declared in driver.compose.json

### 2.3 Static Capability Declaration

For ALL battery drivers, ensure driver.compose.json has:

```json
{
  "capabilities": [
    "measure_battery",
    "alarm_battery",
    // ... other capabilities
  ],
  "energy": {
    "batteries": ["CR2032"]  // or AAA, AA, etc.
  }
}
```

**Drivers to check (~50 battery-powered devices):**
```bash
# Find all drivers with battery but missing static declaration
grep -l "measure_battery" drivers/*/device.js | while read f; do
  dir=$(dirname "$f")
  if ! grep -q "measure_battery" "$dir/driver.compose.json"; then
    echo "MISSING: $dir"
  fi
done
```

---

## 📋 PHASE 3: TS0601 CLIMATE MONITOR

**Goal:** Climate Monitor reliably reports temp/humidity/battery without dataQuery errors.

### 3.1 Locate Driver

**Path:** `drivers/climate_monitor/` or `drivers/climate_monitor_temp_humidity/`

### 3.2 Verify Capabilities

**File:** `driver.compose.json`

```json
{
  "capabilities": [
    "measure_temperature",
    "measure_humidity",
    "measure_battery",
    "alarm_battery"
  ]
}
```

### 3.3 DP Configuration

**Manufacturer:** `_TZE284_vvmbj46n`

✅ Already added in Vague 1:
- DP 1 → measure_temperature (÷10)
- DP 2 → measure_humidity
- DP 4 → measure_battery

**File:** `lib/tuya/TuyaDPDatabase.js` - Section CLIMATE_MONITOR

### 3.4 Device Integration

**File:** `drivers/climate_monitor/device.js`

✅ Already integrated in V4:
```javascript
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');
const TuyaTimeSyncManager = require('../../lib/tuya/TuyaTimeSyncManager');

async onNodeInit({ zclNode }) {
  // ✅ V4: AUTO DP MAPPING
  await TuyaDPMapper.autoSetup(this, zclNode);

  // ✅ V4: TIME SYNC
  this.timeSyncManager = new TuyaTimeSyncManager(this);
  await this.timeSyncManager.initialize(zclNode);

  // ✅ V4: BATTERY V4
  this.batteryManagerV4 = new BatteryManagerV4(this, 'AAA');
  await this.batteryManagerV4.startMonitoring();
}
```

### 3.5 dataQuery Fix

✅ Already fixed in Vague 1:

**File:** `lib/tuya/TuyaAdapter.js`

```javascript
// ✅ New API signature
await tuyaCluster.dataQuery({
  dpValues: [{ dp }]  // ← Array format!
});
```

### 3.6 Logs to Verify

After changes, expect:
```
[CLIMATE-V4] 🌡️  ClimateMonitorDevice initializing (ULTRA VERSION)...
[CLIMATE-V4] 🤖 Starting auto DP mapping...
[TUYA-DP] Mapped DP 1 → measure_temperature
[TUYA-DP] Mapped DP 2 → measure_humidity
[BATTERY-V4] 🔋 Updating battery: 85% (source: tuya_dp, type: AAA)
[BATTERY-V4] ✅ measure_battery updated to 85%
```

---

## 📋 PHASE 4: TS0601 SOIL SENSOR

**Goal:** Soil sensor reports temp + soil_humidity + battery.

### 4.1 Locate Driver

**Path:** `drivers/climate_sensor_soil/`

### 4.2 Verify Capabilities

**File:** `driver.compose.json`

```json
{
  "capabilities": [
    "measure_temperature",
    "measure_humidity.soil",  // ← Custom capability!
    "measure_battery"
  ]
}
```

### 4.3 DP Configuration

**Manufacturer:** `_TZE284_oitavov2`

✅ Already added in Vague 1:
- DP 1 → measure_temperature (÷10)
- DP 2 → measure_humidity.soil
- DP 4 → measure_battery
- DP 5 → battery_state (optional ENUM)

**File:** `lib/tuya/TuyaDPDatabase.js` - Section SOIL_SENSOR

### 4.4 Device Integration

✅ Already integrated in Vague 2:

**File:** `drivers/climate_sensor_soil/device.js`

```javascript
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

async onNodeInit({ zclNode }) {
  if (isTS0601) {
    // ✅ VAGUE 2: Auto DP Mapping
    await TuyaDPMapper.autoSetup(this, zclNode);

    // ✅ VAGUE 2: Battery V4
    this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2032');
    await this.batteryManagerV4.startMonitoring();
  }
}
```

### 4.5 Expected Logs

```
[SOIL-V4] 🤖 Starting auto DP mapping...
[TUYA-DP] Mapped DP 1 → measure_temperature
[TUYA-DP] Mapped DP 2 → measure_humidity.soil
[TUYA-DP] Mapped DP 4 → measure_battery
[BATTERY-V4] 🔋 Updating battery: 100% (source: tuya_dp, type: CR2032)
```

---

## 📋 PHASE 5: TS0601 PRESENCE RADAR

**Goal:** Radar reports motion + luminance + battery.

### 5.1 Locate Driver

**Path:** `drivers/presence_sensor_radar/`

### 5.2 Verify Capabilities

**File:** `driver.compose.json`

```json
{
  "capabilities": [
    "alarm_motion",
    "measure_luminance",  // ← Add if missing!
    "measure_battery"
  ]
}
```

### 5.3 DP Configuration

**Manufacturer:** `_TZE200_rhgsbacq`

✅ Already added in Vague 1:
- DP 1 → alarm_motion (BOOL)
- DP 4 → measure_battery
- DP 9 → measure_luminance (lux) ⭐
- DP 101/102/103 → sensitivity, far/near detection

**File:** `lib/tuya/TuyaDPDatabase.js` - Section RADAR_PIR

### 5.4 Device Integration

✅ Already integrated in Vague 2:

**File:** `drivers/presence_sensor_radar/device.js`

```javascript
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

async onNodeInit({ zclNode }) {
  if (isTS0601) {
    // ✅ VAGUE 2: Auto DP Mapping
    await TuyaDPMapper.autoSetup(this, zclNode);

    // ✅ VAGUE 2: Battery V4
    this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2032');
    await this.batteryManagerV4.startMonitoring();
  }
}
```

### 5.5 DP Discovery Mode

**Optional setting for enrichment:**

```json
// In driver.compose.json settings
{
  "id": "dp_discovery_mode",
  "type": "checkbox",
  "label": {"en": "DP Discovery Mode (Debug)"},
  "value": false
}
```

**In device.js:**
```javascript
if (this.getSetting('dp_discovery_mode')) {
  const TuyaDPDiscovery = require('../../lib/tuya/TuyaDPDiscovery');
  this.dpDiscovery = new TuyaDPDiscovery(this);
  this.dpDiscovery.startDiscovery();
}
```

---

## 📋 PHASE 6: SEPARATE TUYA DP FROM STANDARD ZIGBEE

**Goal:** TS0601 devices DON'T attempt standard ZCL reporting.

### 6.1 Device Type Detection

**Central flag:** `isTuyaDPDevice`

```javascript
// In device init or Smart-Adapt
isTuyaDPDevice() {
  const productId = this.getData()?.productId;
  const manufacturerName = this.getData()?.manufacturerName;

  return (
    productId === 'TS0601' ||
    productId?.startsWith('TS06') ||
    manufacturerName?.startsWith('_TZE') ||
    manufacturerName?.startsWith('_TZ3000_')
  );
}
```

### 6.2 Skip Standard Cluster Config

**In cluster configuration logic:**

```javascript
async setupClusters() {
  if (this.isTuyaDPDevice()) {
    this.log('[TUYA-DP] Device uses 0xEF00 - skipping standard ZCL config');
    // DO NOT configure:
    // - powerConfiguration (0x0001)
    // - temperatureMeasurement (0x0402)
    // - humidityMeasurement (0x0405)
    return;
  }

  // Standard Zigbee path
  this.log('[STANDARD-ZCL] Configuring standard clusters...');
  // ... normal cluster setup
}
```

### 6.3 Expected Behavior

**Before (WRONG):**
```
[ERROR] Error configuring powerConfiguration: Timeout
[ERROR] Error configuring temperatureMeasurement: Timeout
```

**After (CORRECT):**
```
[TUYA-DP] Device uses 0xEF00 - skipping standard ZCL config
[TUYA-DP] Relying on DP reports only
```

---

See CURSOR_REFACTOR_GUIDE_PART2.md for:
- Phase 7: Documentation updates
- Final checklist
- Search/replace patterns
- Git workflow
- Testing procedures
