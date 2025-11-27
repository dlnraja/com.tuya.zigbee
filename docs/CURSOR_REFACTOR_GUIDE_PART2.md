# 🎯 CURSOR REFACTOR MEGA-CHECKLIST - PART 2

## 📋 PHASE 7: DOCUMENTATION & CHANGELOG

### 7.1 Update Migration Guide

**File:** `MIGRATION_V4_GUIDE.md`

**Add new section:**

```markdown
## 🐛 V5.0.0 Fixes vs 4.1.11

### Wireless Remotes & Buttons
**Problem:** TS0041/43/44 and USB buttons showed as switches with on/off controls.

**Fix:**
- Changed `class` from "socket"/"light" to "button"
- Removed `onoff` and `dim` capabilities
- Kept only `measure_battery` + `alarm_battery`
- UI now shows battery-powered remote, not controllable switch

**Affected Drivers:**
- button_ts0041, button_ts0043, button_ts0044
- switch_wireless_1gang → redirected to button_wireless_1
- All USB button variants

---

### TS0601 Climate Monitor
**Problem:** Temperature/humidity not reported, dataQuery errors.

**Fix:**
- Fixed `tuyaSpecific.dataQuery` API signature (dpValues array)
- Integrated TuyaDPMapper autoSetup()
- Disabled active polling, rely on passive DP reports
- Added BatteryManagerV4 with AAA detection

**Affected Models:**
- _TZE284_vvmbj46n (TS0601 Climate)
- _TZE200_* variants

---

### TS0601 Soil Sensor
**Problem:** Only battery worked, temp/humidity null.

**Fix:**
- Added complete DP profile in TuyaDPDatabase
- Mapped DP 1 → temperature (÷10)
- Mapped DP 2 → soil_humidity
- Integrated TuyaDPMapper autoSetup()

**Affected Models:**
- _TZE284_oitavov2 (TS0601 Soil)

---

### TS0601 Presence Radar
**Problem:** Missing luminance, only basic motion.

**Fix:**
- Added DP 9 → measure_luminance mapping
- Extended profile with sensitivity/range DPs
- Integrated TuyaDPMapper autoSetup()
- Added optional DP Discovery mode

**Affected Models:**
- _TZE200_rhgsbacq (TS0601 PIR)

---

### Battery Management
**Problem:** Values internal but not visible in UI.

**Fix:**
- BatteryManagerV4 always calls setCapabilityValue()
- Enhanced logging with emojis (🔋 ✅ ⚠️)
- Static capability declarations in all drivers
- alarm_battery threshold support

---

### Tuya DP vs Standard Zigbee
**Problem:** TS0601 devices timeout on standard cluster config.

**Fix:**
- Detect Tuya DP devices (TS06*, _TZE*)
- Skip standard ZCL reporting for these devices
- Rely solely on 0xEF00 DP reports
- No more timeout errors

```

### 7.2 Update CHANGELOG.md

**Add v5.0.0 section:**

```markdown
## [5.0.0] - 2025-11-23

### 🎉 Major Release - AUDIT V2 Complete Edition

#### Added
- 🚀 **Ultra DP System V4**
  - TuyaDPDatabase with 12 device profiles, 100+ DP mappings
  - TuyaDPMapper with 22 auto-detection patterns
  - TuyaDPDiscovery interactive debug mode
  - TuyaTimeSyncManager for clock synchronization

- 🔋 **BatteryManagerV4**
  - 7 battery technologies (CR2032, CR2450, CR123A, AAA, AA, Li-ion, Li-polymer)
  - 77 non-linear voltage curve points
  - Intelligent 1-4h polling intervals
  - Multi-source acquisition (DP → ZCL → Voltage calculation)

- ⚙️ **Developer Features**
  - Developer Debug Mode (verbosity control)
  - Experimental Smart-Adapt flag (opt-in)
  - Settings system with runtime listeners

#### Fixed
- ✅ **TS0041/43/44 Buttons** - No longer show as switches with on/off
  - Changed class from socket/light to button
  - Removed onoff/dim capabilities
  - Battery-only display

- ✅ **TS0601 Climate Monitor** - Temperature/humidity now report correctly
  - Fixed dataQuery API signature (dpValues array)
  - Disabled broken active polling
  - Integrated TuyaDPMapper autoSetup()

- ✅ **TS0601 Soil Sensor** - Temperature and humidity now visible
  - Added complete DP profile (_TZE284_oitavov2)
  - Mapped temp (÷10) and soil_humidity
  - Integrated V4 systems

- ✅ **TS0601 Radar PIR** - Luminance now reported
  - Added DP 9 → measure_luminance mapping
  - Extended profile with sensitivity/range
  - Optional DP Discovery mode

- ✅ **Battery UI Visibility**
  - BatteryManagerV4 enhanced logs
  - Always updates Homey capabilities
  - Static declarations in all drivers

#### Changed
- 📡 **Tuya DP Device Handling**
  - Separate TS0601/TS06* from standard Zigbee
  - No more timeout errors on standard clusters
  - Rely solely on 0xEF00 DP reports

- 🎯 **Smart-Adapt Behavior**
  - Read-only mode by default
  - Experimental flag for capability modifications
  - Non-destructive suggestions

#### Documentation
- 📚 4,500+ lines of documentation added
  - AUDIT_V2_FINAL_STATUS.md (500 lines)
  - AUDIT_V2_COMPLETE_IMPLEMENTATION.md (700 lines)
  - HOTFIX_VAGUE1_ACTION_PLAN.md (400 lines)
  - MIGRATION_V4_GUIDE.md (350 lines)
  - CURSOR_REFACTOR_GUIDE (800 lines)

#### Aligned With
- ✅ Homey Official SDK Guidelines
- ✅ Zigbee2MQTT converter patterns
- ✅ LocalTuya DP discovery methods
- ✅ Home Assistant integration best practices

### Breaking Changes
None - All changes are backwards compatible.

```

### 7.3 Update README.md

**Add highlight section:**

```markdown
## 🎉 What's New in V5.0.0

### Ultra DP System
Automatic Tuya Data Point mapping inspired by Zigbee2MQTT and LocalTuya:
- **12 device profiles** with 100+ DP mappings
- **22 detection patterns** for auto-setup
- **DP Discovery mode** for new devices
- **Time synchronization** for climate sensors

### Battery Management V4
Scientific voltage-to-percentage conversion:
- **7 battery technologies** supported
- **77 curve points** for accuracy
- **Smart polling** (1-4h adaptive)
- **Multi-source** acquisition

### Stability Improvements
Fixed all known regressions vs 4.1.11:
- ✅ Buttons no longer show as switches
- ✅ TS0601 sensors report all values
- ✅ Battery UI always visible
- ✅ No more cluster timeout errors
```

---

## 📋 FINAL CHECKLIST

### Pre-Commit Verification

```bash
# 1. Check wireless remotes
grep -r '"class".*"socket"' drivers/button_*/driver.compose.json
# ↑ Should be EMPTY or only wired switches

grep -r '"onoff"' drivers/button_*/driver.compose.json
# ↑ Should be EMPTY for remotes

# 2. Check battery declarations
for f in drivers/*/driver.compose.json; do
  if grep -q "BatteryManager" "$(dirname $f)/device.js"; then
    if ! grep -q "measure_battery" "$f"; then
      echo "MISSING BATTERY: $f"
    fi
  fi
done

# 3. Check Tuya DP integrations
grep -l "TuyaDPMapper.autoSetup" drivers/*/device.js
# ↑ Should include: climate_monitor, climate_sensor_soil, presence_sensor_radar

# 4. Check dataQuery fixes
grep -r "dataQuery.*{.*dp:" lib/ drivers/
# ↑ Should show dpValues array format

# 5. Check logs are not excessive
grep -c "console.log\|this.log" drivers/climate_monitor/device.js
# ↑ Should be reasonable (<50)
```

### Manual Testing Checklist

- [ ] **TS0041 Button**
  - Pair device
  - Check UI shows button icon (not switch)
  - Check no on/off tile
  - Check battery % visible
  - Press button → flow triggered

- [ ] **TS0601 Climate**
  - Check temperature updates (not null)
  - Check humidity updates (not null)
  - Check battery % visible
  - No dataQuery errors in logs

- [ ] **TS0601 Soil**
  - Check temperature visible
  - Check soil_humidity visible
  - Check battery visible
  - All values updating

- [ ] **TS0601 Radar**
  - Check motion detection works
  - Check luminance visible ⭐
  - Check battery visible
  - No timeout errors in logs

- [ ] **Battery Logs**
  - Check logs show: `[BATTERY-V4] 🔋 Updating battery: X%`
  - Check logs show: `[BATTERY-V4] ✅ measure_battery updated`
  - Check values actually change in Homey

- [ ] **No Cluster Timeouts**
  - For TS0601 devices:
  - No `Error configuring powerConfiguration`
  - No `Error configuring temperatureMeasurement`
  - Logs show: `[TUYA-DP] Skipping standard ZCL config`

---

## 🔍 SEARCH & REPLACE PATTERNS

### Pattern 1: Fix Button Classes

**Search:**
```json
"class": "socket",
```

**Check context:** Is this a button/remote driver?

**Replace with:**
```json
"class": "button",
```

---

### Pattern 2: Remove onoff from Buttons

**Search in button drivers:**
```json
"capabilities": [
  "onoff",
```

**Replace with:**
```json
"capabilities": [
```

---

### Pattern 3: Add Battery Capabilities

**Search:**
```json
"capabilities": [
  "measure_battery"
]
```

**Replace with:**
```json
"capabilities": [
  "measure_battery",
  "alarm_battery"
]
```

---

### Pattern 4: Add Energy Section

**Search (missing energy section):**
```json
  "capabilities": [...],
  "zigbee": {
```

**Replace with:**
```json
  "capabilities": [...],
  "energy": {
    "batteries": ["CR2032"]
  },
  "zigbee": {
```

---

### Pattern 5: Fix dataQuery Calls

**Search:**
```javascript
await tuyaCluster.dataQuery({ dp: dpId });
```

**Replace with:**
```javascript
await tuyaCluster.dataQuery({ dpValues: [{ dp: dpId }] });
```

---

## 🚀 GIT WORKFLOW

### Commit Strategy

```bash
# Work in feature branch
git checkout -b feature/v5-audit-v2-complete

# Commit by phase
git add drivers/button_*
git commit -m "fix: buttons class=button, remove onoff/dim (Phase 1)"

git add lib/BatteryManagerV4.js drivers/*/device.js
git commit -m "fix: battery pipeline - always update capabilities (Phase 2)"

git add drivers/climate_monitor drivers/climate_sensor_soil drivers/presence_sensor_radar
git commit -m "fix: TS0601 devices - autoSetup integration (Phase 3-5)"

git add lib/SmartAdaptManager.js lib/devices/BaseHybridDevice.js
git commit -m "fix: separate Tuya DP from standard Zigbee (Phase 6)"

git add *.md
git commit -m "docs: update migration guide, changelog, README (Phase 7)"

# Merge to master
git checkout master
git merge feature/v5-audit-v2-complete

# Tag release
git tag v5.0.1
git push origin master --tags
```

---

## 📊 QUICK REFERENCE

### Key Files

| Category | File | Purpose |
|----------|------|---------|
| **Core** | `lib/tuya/TuyaDPDatabase.js` | DP profiles |
| | `lib/tuya/TuyaDPMapper.js` | Auto-mapping |
| | `lib/tuya/TuyaAdapter.js` | dataQuery fix |
| | `lib/BatteryManagerV4.js` | Battery logic |
| **Drivers** | `drivers/climate_monitor/device.js` | Climate V4 |
| | `drivers/climate_sensor_soil/device.js` | Soil V4 |
| | `drivers/presence_sensor_radar/device.js` | Radar V4 |
| | `drivers/button_ts004*/driver.compose.json` | Button config |
| **Docs** | `MIGRATION_V4_GUIDE.md` | User guide |
| | `CHANGELOG.md` | Version history |
| | `CURSOR_REFACTOR_GUIDE_*.md` | This guide |

---

### DP Profile Template

```javascript
// In lib/tuya/TuyaDPDatabase.js
'YOUR_DEVICE_KEY': {
  name: 'Device Name',
  manufacturers: ['_TZE...', '_TZ3000_...'],
  model: 'TS0601',
  dps: {
    1: {
      name: 'field_name',
      type: 0x02,           // VALUE (0x01=BOOL, 0x02=VALUE, 0x04=ENUM)
      divider: 10,          // Optional: value ÷ 10
      unit: '°C',           // Optional: display unit
      capability: 'measure_temperature'
    },
    // ... more DPs
  }
}
```

---

### Device Init Template

```javascript
// In drivers/YOUR_DRIVER/device.js
const TuyaDPMapper = require('../../lib/tuya/TuyaDPMapper');
const BatteryManagerV4 = require('../../lib/BatteryManagerV4');

class YourDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    if (this.isTuyaDPDevice()) {
      // AUTO DP MAPPING
      await TuyaDPMapper.autoSetup(this, zclNode);

      // BATTERY V4
      this.batteryManagerV4 = new BatteryManagerV4(this, 'CR2032');
      await this.batteryManagerV4.startMonitoring();
    }
  }
}
```

---

## ✅ SUCCESS CRITERIA

After all phases complete, you should have:

1. **Zero** wireless remotes with `class: "socket"` or `class: "light"`
2. **Zero** button drivers with `onoff` or `dim` capabilities
3. **All** battery drivers declare `measure_battery` statically
4. **All** TS0601 devices use TuyaDPMapper autoSetup()
5. **Zero** dataQuery errors in logs
6. **Zero** timeout errors on TS0601 standard cluster config
7. **Documentation** updated with all changes
8. **Logs** clear and not excessive

---

## 🎯 POST-REFACTOR TASKS

### Immediate (Same Session)
- [ ] Test on real devices (at least 1 button, 1 TS0601)
- [ ] Check Homey logs for errors
- [ ] Verify battery UI visible
- [ ] Verify capabilities update correctly

### Short Term (1-2 days)
- [ ] Community beta testing
- [ ] Gather feedback on GitHub issues
- [ ] Monitor crash reports
- [ ] Update troubleshooting docs

### Medium Term (1 week)
- [ ] Migrate 20+ remaining drivers to V4
- [ ] Enrich DP profiles with community data
- [ ] Add more flow cards
- [ ] Performance optimization

---

**READY TO REFACTOR? LET'S GO! 🚀**

**Remember:**
- Work in feature branch
- Commit by phase
- Test incrementally
- Document everything
- Ask community for testing

**Made with ❤️ for a stable Tuya Zigbee experience!**
