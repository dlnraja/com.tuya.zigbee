# Development Rules - Tuya Unified Zigbee

> **Updated: 2026-05-30** -- Added Archive Size Rules (Root Cause: Processing Failed v8.1.7+)

## CRITICAL RULES

### 0. Archive Size Rule (ROOT CAUSE -- Processing Failed v8.1.7 to v8.1.26)

DISCOVERED 2026-05-30: Every publish from v8.1.7 to v8.1.26 silently failed with
"Processing failed" on Athom. Root cause: `.diag/` (55MB of CI screenshots/tarballs)
was NOT in `.homeyignore`. Archive reached ~39MB compressed > Athom 30MB limit.
Fix: Added `.diag/` `.memory/` `.ai/` `.gemini/` to `.homeyignore`.

Mandatory checks before ANY publish commit:
  node .github/scripts/check-archive-size.js   # Must exit 0 (< 20MB compressed)
  node .github/scripts/athom-archive-audit.js  # Full audit report

NEVER ship to Athom: .diag/ .memory/ .ai/ .gemini/ screenshots/ docs/ reports/
  reimplementation_gateway/ (contains 40MB MP4!) data/archive/

REQUIRED in archive: app.json app.js package.json .homeychangelog.json
  driver-mapping-database.json data/fingerprints.json lib/tuya/fingerprints.json
  locales/*.json assets/icon.svg README.txt (+ nl/de/fr)
  drivers/*/assets/icon.svg + small.png + large.png

---
```
_TZ3000_abcdefgh + TS0001  switch_1gang
_TZ3000_abcdefgh + TS0002  switch_2gang
_TZ3000_abcdefgh + TS0003  switch_3gang
_TZ3000_abcdefgh + TS0012  dimmer_2gang
```
The same manufacturer makes multiple device variants with different productIds.

#### Fingerprint = manufacturerName + productId (COMBINED)
Homey matches BOTH values together. A device is matched when:
- Its `manufacturerName` is in the driver's list AND
- Its `productId` is in the driver's list

####  TRUE conflicts to avoid
Only remove a fingerprint if it causes WRONG driver matching:
- Same manufacturerName + same productId in two incompatible drivers
- Example: `_TZ3000_xyz` + `TS0002` in both `switch_2gang` AND `dimmer_2gang`

#### Common Multi-Driver Manufacturers
- `_TZ3000_*` - Often makes 1-gang, 2-gang, 3-gang switch variants
- `_TZE200_*` / `_TZE204_*` - Tuya DP devices across sensors, TRVs, covers
- Same OEM supplies different productIds for different device types

### 3. SDK3 Compliance
- **Getter Mandate**: ALWAYS use `this.homey.flow.getTriggerCard('id')`, `this.homey.flow.getActionCard('id')`, or `this.homey.flow.getConditionCard('id')` for driver-specific flow cards. Generic methods like `getTriggerCard` (without calling on flow manager) are DEPRECATED in some contexts, but the 'Device' suffix added in previous documentation was a hallucination and causes runtime crashes.
- **Card IDs**: Every getter call MUST pass the explicit ID defined in `driver.flow.compose.json`. Naked calls (without arguments) are INVALID and will cause flows to remain unlinked.
- **No wildcards** in manufacturerName (e.g., `_TZE284_*` is INVALID).
- All flow cards must be registered in both `driver.flow.compose.json` AND compiled into `app.json`.

### 4. Case-Less & Sanitization Standards (ZERO-TOLERANCE)
- **Architectural Mandate**: ALL comparisons involving `manufacturerName`, `modelId`, or `productId` MUST be case-insensitive AND sanitized.
- **Implementation**: ONLY use `lib/utils/CaseInsensitiveMatcher.js`. Manual `.toLowerCase()`, `.toUpperCase()`, or `.trim()` on these fields in driver or maintenance logic is EXPLICITLY FORBIDDEN.
- **Invisible Character Cleanup**: We must proactively eliminate null bytes (`\0`), control characters, and non-breaking spaces that frequently corrupt Tuya firmware reports.
- **Standards Enforcement**: Maintenance scripts like `zero-defect-architect-audit.js` will automatically reject any code or manifest that uses raw string comparisons or contains unsanitized invisible characters.
- **Fingerprints**: While logic is case-insensitive, keep exact discovered casing in `driver.compose.json` for reference, but acknowledge that the matching engine is case-less.

### 5. Sleepy Battery Devices
TS0601 battery devices use **passive mode**:
- Cluster 0xEF00 may not be directly accessible
- Data reports when device wakes (up to 24h for first report)
- This is EXPECTED BEHAVIOR, not a bug

### 6. Tuya Time Sync (10-byte Standard) - NEW
Modern Tuya devices (TZE284 series) require precise timing responses:
- **Payload Format**: `[seq:2][UTC:4][Local:4]` (10 bytes total).
- **Sequence Number**: The GW MUST extract and echo the `seqNum` from the device's request frame (Cmd 0x24).
- **Implementation**: Use the unified `_respondToTimeSync(sequenceNumber)` method in `BaseUnifiedDevice` which delegates to `TuyaTimeSync.js`.
- **Warning**: Sending only 8 bytes or an incorrect sequence number will cause time sync to fail and the device to remain in an unconfigured state.

---

##  Flow Card Rules

### Flow Card ID Matching
- Flow card IDs in `driver.js` MUST exactly match IDs in `driver.flow.compose.json`.
- Standard Prefix: `${driverId}_`. Auto-prefixed by Rule 11 of the Self-Heal engine.
- Multi-gang Pattern: `${driverId}_gang${N}_${action}` or `${driverId}_physical_gang${N}_${action}`.

### Flow Card Registration Pattern
```javascript
//  CORRECT: SDK 3 compliant with explicit ID
const flowId = 'my_driver_trigger_name';
this._triggerCard = this.homey.flow.getTriggerCard(flowId);

//  INCORRECT: Missing ID and non-existent getter
this._triggerCard = this.homey.flow.getDeviceTriggerCard(); 
```

---

##  Device Support Rules

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

### Unified Energy & Battery Handling
**CRITICAL RULE**: Tuya manufacturers frequently mix hardware cases! A device seemingly designed for wall installation might be battery-powered, mains-powered, self-kinetic (mechanical push force), or hybrid.
1. **Never assume static power sources.** Drivers must handle all variants regardless of the driver's name.
2. **UnifiedBatteryHandler & SmartBatteryManager**: Drivers leverage the bidirectional sync engine in `SmartBatteryManager.js` for energy management. It dynamically adapts at runtime to:
   - Native Zigbee (`genPowerCfg`)
   - Tuya DP (`batteryPercentageRemaining`)
   - Custom Zigbee
   - Missing battery attributes (detects if it's mechanical/mains instead)
3. **Capability Injection**: Declare both `measure_battery` and `alarm_battery` when variants might have batteries. 
4. **Bidirectional Sync & Conflict Resolution**: The runtime automatically reconciles percentage drops to trigger the low battery alarm. Conversely, if a device only reports binary low battery alarms, `SmartBatteryManager` synthesizes clean virtual percentages (10% on alarm, 100% on healthy) to prevent empty layout blocks or card glitches on the Homey UI.

### 7. Smart Scale Value Correctors (NEW)
**CRITICAL RULE**: Do not write hardcoded ad-hoc scaling or division calculations (e.g. `value / 100`) inside individual drivers for standard temperature, humidity, voltage, current, power, or energy readings.
1. **Global Interceptor**: The base `TuyaZigbeeDevice.js` class intercepts all calls to `safeSetCapabilityValue` and runs them through `smartScaleValue` globally.
2. **Auto-divisors**: This automatically repairs out-of-bounds metrics (such as scaling temperature tenths vs hundredths or voltage millivolts vs volts) based on physiological ranges, keeping code clean and eliminating ad-hoc divisor bugs.

### 8. Post-Promotion Documentation & Registry Synchronization (MANDATORY)
- **Mandatory Protocol**: Refer to [POST_PROMOTION_PROTOCOL.md](file:///c:/Users/HP/Desktop/homey%20app/tuya_repair/docs/rules/POST_PROMOTION_PROTOCOL.md) for the mandatory recursive audit, enrichment loop, and technical safeguards (Layer 12 compliance).


---

##  Sources for Device Research

### Primary Sources
1. **Zigbee2MQTT**: https://www.zigbee2mqtt.io/supported-devices/
2. **ZHA Device Handlers**: https://github.com/zigpy/zha-device-handlers
3. **Blakadder**: https://zigbee.blakadder.com/

### Secondary Sources
4. **Homey Community Forum**: #
5. **GitHub Issues**: Search for manufacturerName patterns
6. **AliExpress**: Product descriptions often contain model info

---

##  Project Structure

### Key Directories
- `drivers/` - All device drivers (organized by FUNCTION, not brand)
- `lib/devices/` - Base classes (UnifiedSensorBase, UnifiedPlugBase, etc.)
- `lib/tuya/` - Tuya EF00 cluster handling
- `docs/rules/` - This rules documentation
- `docs/fixes/` - Fix documentation

### Naming Convention
Drivers are named by **function**, not brand:
-  `switch_2gang`, `climate_sensor`, `presence_sensor_radar`
-  `tuya_switch`, `moes_thermostat`

---

##  Git Workflow

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

##  Common Issues & Solutions

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
# Development Rules - Universal Tuya Zigbee

##  CRITICAL RULES

### 1. Publication Rule
**NEVER use `npx homey app publish` locally.**  
Always publish via GitHub Actions by pushing to master/main branch.
The workflow `.github/workflows/publish.yml` handles publication automatically.

### 2. ManufacturerName Duplication Rule
**ManufacturerNames CAN be in multiple drivers** - this is NORMAL and EXPECTED!

####  VALID: Same manufacturerName in multiple drivers
```
_TZ3000_abcdefgh + TS0001  switch_1gang
_TZ3000_abcdefgh + TS0002  switch_2gang
_TZ3000_abcdefgh + TS0003  switch_3gang
_TZ3000_abcdefgh + TS0012  dimmer_2gang
```
The same manufacturer makes multiple device variants with different productIds.

#### Fingerprint = manufacturerName + productId (COMBINED)
Homey matches BOTH values together. A device is matched when:
- Its `manufacturerName` is in the driver's list AND
- Its `productId` is in the driver's list

####  TRUE conflicts to avoid
Only remove a fingerprint if it causes WRONG driver matching:
- Same manufacturerName + same productId in two incompatible drivers
- Example: `_TZ3000_xyz` + `TS0002` in both `switch_2gang` AND `dimmer_2gang`

#### Common Multi-Driver Manufacturers
- `_TZ3000_*` - Often makes 1-gang, 2-gang, 3-gang switch variants
- `_TZE200_*` / `_TZE204_*` - Tuya DP devices across sensors, TRVs, covers
- Same OEM supplies different productIds for different device types

### 3. SDK3 Compliance
- **Getter Mandate**: ALWAYS use `this.homey.flow.getTriggerCard('id')`, `this.homey.flow.getActionCard('id')`, or `this.homey.flow.getConditionCard('id')` for driver-specific flow cards. Generic methods like `getTriggerCard` (without calling on flow manager) are DEPRECATED in some contexts, but the 'Device' suffix added in previous documentation was a hallucination and causes runtime crashes.
- **Card IDs**: Every getter call MUST pass the explicit ID defined in `driver.flow.compose.json`. Naked calls (without arguments) are INVALID and will cause flows to remain unlinked.
- **No wildcards** in manufacturerName (e.g., `_TZE284_*` is INVALID).
- All flow cards must be registered in both `driver.flow.compose.json` AND compiled into `app.json`.

### 4. Case-Less & Sanitization Standards (ZERO-TOLERANCE)
- **Architectural Mandate**: ALL comparisons involving `manufacturerName`, `modelId`, or `productId` MUST be case-insensitive AND sanitized.
- **Implementation**: ONLY use `lib/utils/CaseInsensitiveMatcher.js`. Manual `.toLowerCase()`, `.toUpperCase()`, or `.trim()` on these fields in driver or maintenance logic is EXPLICITLY FORBIDDEN.
- **Invisible Character Cleanup**: We must proactively eliminate null bytes (`\0`), control characters, and non-breaking spaces that frequently corrupt Tuya firmware reports.
- **Standards Enforcement**: Maintenance scripts like `zero-defect-architect-audit.js` will automatically reject any code or manifest that uses raw string comparisons or contains unsanitized invisible characters.
- **Fingerprints**: While logic is case-insensitive, keep exact discovered casing in `driver.compose.json` for reference, but acknowledge that the matching engine is case-less.

### 5. Sleepy Battery Devices
TS0601 battery devices use **passive mode**:
- Cluster 0xEF00 may not be directly accessible
- Data reports when device wakes (up to 24h for first report)
- This is EXPECTED BEHAVIOR, not a bug

### 6. Tuya Time Sync (10-byte Standard) - NEW
Modern Tuya devices (TZE284 series) require precise timing responses:
- **Payload Format**: `[seq:2][UTC:4][Local:4]` (10 bytes total).
- **Sequence Number**: The GW MUST extract and echo the `seqNum` from the device's request frame (Cmd 0x24).
- **Implementation**: Use the unified `_respondToTimeSync(sequenceNumber)` method in `BaseHybridDevice` which delegates to `TuyaTimeSync.js`.
- **Warning**: Sending only 8 bytes or an incorrect sequence number will cause time sync to fail and the device to remain in an unconfigured state.

---

##  Flow Card Rules

### Flow Card ID Matching
- Flow card IDs in `driver.js` MUST exactly match IDs in `driver.flow.compose.json`.
- Standard Prefix: `${driverId}_`. Auto-prefixed by Rule 11 of the Self-Heal engine.
- Multi-gang Pattern: `${driverId}_gang${N}_${action}` or `${driverId}_physical_gang${N}_${action}`.

### Flow Card Registration Pattern
```javascript
//  CORRECT: SDK 3 compliant with explicit ID
const flowId = 'my_driver_trigger_name';
this._triggerCard = this.homey.flow.getTriggerCard(flowId);

//  INCORRECT: Missing ID and non-existent getter
this._triggerCard = this.homey.flow.getDeviceTriggerCard(); 
```

---

##  Device Support Rules

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

### Hybrid Energy & Battery Handling
**CRITICAL RULE**: Tuya manufacturers frequently mix hardware cases! A device seemingly designed for wall installation might be battery-powered, mains-powered, self-kinetic (mechanical push force), or hybrid.
1. **Never assume static power sources.** Drivers must handle all variants regardless of the driver's name.
2. **UnifiedBatteryHandler**: Drivers MUST use `UnifiedBatteryHandler` for energy management. It dynamically adapts at runtime to:
   - Native Zigbee (`genPowerCfg`)
   - Tuya DP (`batteryPercentageRemaining`)
   - Custom Zigbee
   - Missing battery attributes (detects if it's mechanical/mains instead)
3. **Capability Injection**: Declare `measure_battery` in `driver.compose.json` when variants *might* have batteries. The handler will auto-remove it at runtime if the matched device has `mainsPowered().` No destructive string replacements!
4. **SDK v3 Conflicts**: Exclusively use `measure_battery`. NEVER include both `measure_battery` and `alarm_battery`.

---

##  Sources for Device Research

### Primary Sources
1. **Zigbee2MQTT**: https://www.zigbee2mqtt.io/supported-devices/
2. **ZHA Device Handlers**: https://github.com/zigpy/zha-device-handlers
3. **Blakadder**: https://zigbee.blakadder.com/

### Secondary Sources
4. **Homey Community Forum**: https://community.homey.app/
5. **GitHub Issues**: Search for manufacturerName patterns
6. **AliExpress**: Product descriptions often contain model info

---

##  Project Structure

### Key Directories
- `drivers/` - All device drivers (organized by FUNCTION, not brand)
- `lib/devices/` - Base classes (HybridSensorBase, HybridPlugBase, etc.)
- `lib/tuya/` - Tuya EF00 cluster handling
- `docs/rules/` - This rules documentation
- `docs/fixes/` - Fix documentation

### Naming Convention
Drivers are named by **function**, not brand:
-  `switch_2gang`, `climate_sensor`, `presence_sensor_radar`
-  `tuya_switch`, `moes_thermostat`

---

##  Git Workflow

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

##  Common Issues & Solutions

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
