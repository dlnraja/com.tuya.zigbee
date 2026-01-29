# Development Rules - Universal Tuya Zigbee

## 🚨 CRITICAL RULES

### 1. Publication Rule
**NEVER use `npx homey app publish` locally.**  
Always publish via GitHub Actions by pushing to master/main branch.
The workflow `.github/workflows/publish.yml` handles publication automatically.

### 2. ManufacturerName Duplication Rule
**ManufacturerNames CAN be in multiple drivers** - this is NORMAL and EXPECTED!

#### ✅ VALID: Same manufacturerName in multiple drivers
```
_TZ3000_abcdefgh + TS0001 → switch_1gang
_TZ3000_abcdefgh + TS0002 → switch_2gang
_TZ3000_abcdefgh + TS0003 → switch_3gang
_TZ3000_abcdefgh + TS0012 → dimmer_2gang
```
The same manufacturer makes multiple device variants with different productIds.

#### Fingerprint = manufacturerName + productId (COMBINED)
Homey matches BOTH values together. A device is matched when:
- Its `manufacturerName` is in the driver's list AND
- Its `productId` is in the driver's list

#### ❌ TRUE conflicts to avoid
Only remove a fingerprint if it causes WRONG driver matching:
- Same manufacturerName + same productId in two incompatible drivers
- Example: `_TZ3000_xyz` + `TS0002` in both `switch_2gang` AND `dimmer_2gang`

#### Common Multi-Driver Manufacturers
- `_TZ3000_*` - Often makes 1-gang, 2-gang, 3-gang switch variants
- `_TZE200_*` / `_TZE204_*` - Tuya DP devices across sensors, TRVs, covers
- Same OEM supplies different productIds for different device types

### 3. SDK3 Compliance
- **No wildcards** in manufacturerName (e.g., `_TZE284_*` is INVALID)
- Must use complete IDs like `_TZE284_rccxox8p`
- All flow cards must be registered in both `driver.flow.compose.json` AND compiled into `app.json`

### 4. Case-Insensitive Matching
All manufacturerName/productId comparisons use case-insensitive matching.
Include both cases when possible: `_TZE200_abcdefgh` and `_tze200_abcdefgh`

### 5. Sleepy Battery Devices
TS0601 battery devices use **passive mode**:
- Cluster 0xEF00 may not be directly accessible
- Data reports when device wakes (up to 24h for first report)
- This is EXPECTED BEHAVIOR, not a bug

---

## 📋 Flow Card Rules

### Flow Card ID Matching
- Flow card IDs in `driver.js` MUST exactly match IDs in `driver.flow.compose.json`
- If compose doesn't auto-compile to `app.json`, add manually to `app.json`

### Flow Card Registration Pattern
```javascript
// In driver.js onInit()
this._triggerCard = this.homey.flow.getDeviceTriggerCard('driver_name_trigger_id');

// The ID must exist in driver.flow.compose.json:
{
  "triggers": [{
    "id": "driver_name_trigger_id",
    "title": { "en": "...", "fr": "..." }
  }]
}
```

---

## 🔧 Device Support Rules

### Adding New Manufacturer IDs
1. Search Zigbee2MQTT, ZHA, Blakadder for existing IDs
2. Add both uppercase and lowercase variants
3. Verify productId compatibility
4. Test with `homey app validate`

### DP Mappings for TS0601
Common Tuya DataPoint mappings:
- DP1: Primary state (on/off, alarm, etc.)
- DP2: Secondary value (temperature, etc.)
- DP3: Tertiary value (humidity, etc.)
- DP4/DP14/DP15: Battery level
- DP101-105: Extended functions

### Cluster Bindings
For battery devices, bindings must be in `driver.compose.json`:
```json
"bindings": [1, 1280, 1281]  // powerConfiguration, iasZone, iasAce
```

---

## 🌐 Sources for Device Research

### Primary Sources
1. **Zigbee2MQTT**: https://www.zigbee2mqtt.io/supported-devices/
2. **ZHA Device Handlers**: https://github.com/zigpy/zha-device-handlers
3. **Blakadder**: https://zigbee.blakadder.com/

### Secondary Sources
4. **Homey Community Forum**: https://community.homey.app/
5. **GitHub Issues**: Search for manufacturerName patterns
6. **AliExpress**: Product descriptions often contain model info

---

## 📁 Project Structure

### Key Directories
- `drivers/` - All device drivers (organized by FUNCTION, not brand)
- `lib/devices/` - Base classes (HybridSensorBase, HybridPlugBase, etc.)
- `lib/tuya/` - Tuya EF00 cluster handling
- `docs/rules/` - This rules documentation
- `docs/fixes/` - Fix documentation

### Naming Convention
Drivers are named by **function**, not brand:
- ✅ `switch_2gang`, `climate_sensor`, `presence_sensor_radar`
- ❌ `tuya_switch`, `moes_thermostat`

---

## 🔄 Git Workflow

### Commit Messages
Format: `v{version}: {description}`
Example: `v5.5.708: Fix scene_switch flow cards - add 13 missing triggers`

### Before Pushing
1. Run `npx homey app validate`
2. Ensure no syntax errors
3. Update `.homeychangelog.json` with new version

### Auto-Sync
GitHub Actions auto-syncs README on push (skip with `[skip ci]` in commit message).

---

## 🐛 Common Issues & Solutions

### "Invalid Flow Card ID"
**Cause**: Flow card not in `app.json`
**Fix**: Add flow card definition to `app.json` flow.triggers section

### "Binding implementation must be an instance of BoundCluster"
**Cause**: Trying to bind non-existent cluster
**Fix**: This is expected for battery devices - passive mode is automatic

### "Cluster 0xEF00 not accessible"
**Cause**: Sleepy device hasn't exposed cluster yet
**Fix**: Wait for device wake cycle (passive mode handles this)

### Device pairs but no data
**Possible causes**:
1. Wrong driver matched - check manufacturerName
2. DP mappings incorrect - analyze with diagnostic logs
3. Sleepy device - wait for wake cycle
