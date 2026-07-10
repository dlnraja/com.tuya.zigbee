# Development Rules - Tuya Unified Zigbee

##  CRITICAL RULES

### 0. Cross-App Prompt Benefit Rule
Every AI prompt, automation, issue response, PR review, diagnostic summary, and code change must benefit both maintained app tracks whenever safely possible:
- `master` / `com.dlnraja.tuya.zigbee`
- `stable-v5` / `com.dlnraja.tuya.zigbee.stable`

Before changing code or writing an answer, classify the finding as master-only, stable-only, or cross-app. Security, diagnostics, SDK3 validation, publish verification, crash fixes, battery fixes, physical button fixes, endpoint mapping fixes, and flow reliability fixes are cross-app candidates by default. Keep branch separation strict: never copy App IDs, version metadata, publish settings, or store URLs between tracks.

Diagnostic-history work must also follow `docs/rules/DIAGNOSTIC_HISTORY_RULES.md`: sanitize first, run `npm run check:diag-history`, and never commit raw Gmail/Homey/forum/GitHub diagnostic state.

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

### 3. SDK3 Compliance
- **Getter Mandate**: ALWAYS use `this.homey.flow.getTriggerCard('id')`, `this.homey.flow.getActionCard('id')`, or `this.homey.flow.getConditionCard('id')` for driver-specific flow cards.
- **Card IDs**: Every getter call MUST pass the explicit ID defined in `driver.flow.compose.json`.
- **No wildcards** in manufacturerName (e.g., `_TZE284_*` is INVALID).
- **Missing Capability Listeners**: If you add a capability (like `button.1` or `button.toggle`) to `driver.compose.json`, you MUST register a listener (`this.registerCapabilityListener`) in the device class (e.g. `BaseUnifiedDevice`), even if it does nothing but log the event. Otherwise, Homey will throw a `Missing capability listener` crash when the UI element is interacted with or added to a flow.
- **Energy.Batteries Array**: If `measure_battery` or `alarm_battery` is declared in a driver's capabilities, SDK3 STRICTLY REQUIRES you to also define `energy: { batteries: ["CR2032"] }` in the same manifest. Omission causes `npx homey app validate` to fail with: `is missing an array 'energy.batteries'`.

### 4. Case-Less & Sanitization Standards (ZERO-TOLERANCE)
- **Architectural Mandate**: ALL comparisons involving `manufacturerName`, `modelId`, or `productId` MUST be case-insensitive AND sanitized.
- **Implementation**: ONLY use `lib/utils/CaseInsensitiveMatcher.js`.

### 5. Sleepy Battery Devices
TS0601 battery devices use **passive mode**:
- Cluster 0xEF00 may not be directly accessible
- Data reports when device wakes (up to 24h for first report)

### 6. Tuya Time Sync (10-byte Standard)
Modern Tuya devices (TZE284 series) require precise timing responses:
- **Payload Format**: `[seq:2][UTC:4][Local:4]` (10 bytes total).
- **Implementation**: Use the unified `_respondToTimeSync(sequenceNumber)` method in `BaseUnifiedDevice`.

### 7. Hybrid Energy & Battery Handling
**CRITICAL RULE**: Tuya manufacturers frequently mix hardware cases!
1. **Never assume static power sources.** Drivers must handle all variants regardless of the driver's name.
2. **UnifiedBatteryHandler**: Drivers MUST use `UnifiedBatteryHandler` for energy management. It dynamically adapts at runtime.
3. **Capability Injection**: Declare `measure_battery` in `driver.compose.json` when variants *might* have batteries. The handler will auto-remove it at runtime if the matched device is mains-powered.

---

##  Sources for Device Research

1. **Zigbee2MQTT**: https://www.zigbee2mqtt.io/supported-devices/
2. **ZHA Device Handlers**: https://github.com/zigpy/zha-device-handlers
3. **Blakadder**: https://zigbee.blakadder.com/

---

##  Project Structure

### Key Directories
- `drivers/` - All device drivers (organized by FUNCTION, not brand)
- `lib/devices/` - Base classes (UnifiedSensorBase, UnifiedPlugBase, etc.)
- `docs/rules/` - This rules documentation
