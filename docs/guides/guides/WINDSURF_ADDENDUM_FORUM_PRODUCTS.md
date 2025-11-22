# WINDSURF AI - ADDENDUM: FORUM #407 SPECIFIC PRODUCTS

**⚠️ READ THIS AFTER MAIN PROMPT (`WINDSURF_AI_PROMPT.md`)**

## 🎯 USER-REPORTED FAILING PRODUCTS (Forum #407)

### Analysis Source
- **Forum Thread**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/407
- **User**: Peter_van_Werkhoven
- **Diagnostic ID**: `54e90adf-069d-4d24-bb66-83372cadc817`
- **Analysis**: Gemini AI + Diagnostic reports

---

## 🔴 PRODUCT 1: Radar mmWave Motion + Temp/Humidity Sensor

### Product Info
- **Name**: ZigBee Human Motion Sensor Radar Mmwave Temperature and Humidity Sensor
- **Purchase Link**: https://a.aliexpress.com/_EuHhvD2
- **Status**: ⚠️ **Incompatible** (marked by user in forum)

### Symptoms
- No motion detection data
- No temperature/humidity readings
- Device pairs but shows no data

### Current Driver
- **Path**: `drivers/radar_motion_sensor_mmwave_battery/`
- **Issue**: Driver exists but may be missing specific manufacturer IDs for this AliExpress variant

### Required Actions

#### 1. Extract Device Fingerprint
Ask user Peter_van_Werkhoven for:
```
- ManufacturerName
- ModelId  
- Endpoints + Clusters (from Developer Tools)
- Screenshot of device info
```

#### 2. Check Driver Coverage
Current `driver.compose.json` has 75+ manufacturer IDs, but AliExpress variants often use new IDs like:
- `_TZE284_*` series (check if missing)
- `_TZE200_*` series (radar specific)

#### 3. Apply IAS Zone Fix
If motion detection fails:
- Ensure `device.js` uses `IASZoneEnroller` (like SOS button)
- Apply same fixes from main prompt (wait-ready, retries, safe strings)

#### 4. Check TS0601 DP Mapping
If it's TS0601 variant:
```javascript
// May need DP mapping for temp/hum/motion:
{
  "profile": "radar_th_motion.ts0601.v1",
  "dpMap": {
    "motion": 1,      // presence
    "temperature": 2, // temp in 0.1°C
    "humidity": 3,    // humidity %
    "battery": 4      // battery %
  }
}
```

#### 5. Template Response for Forum
```markdown
@Peter_van_Werkhoven - For the Radar mmWave sensor from AliExpress:

Could you please provide a diagnostic report with the device paired?
1. Pair the device
2. Go to Developer Tools → Devices → [Your Radar Sensor]
3. Click "Create Diagnostic Report"
4. Share the diagnostic ID here

Also, please share a screenshot of:
- Developer Tools → Devices → [Your Radar Sensor] → "Advanced" tab

This will show the exact manufacturer ID we need to add.
```

---

## 🔴 PRODUCT 2: Smart Scene Switch 4 Gang Wireless

### Product Info
- **Name**: Smart ZigBee Scene Switch Wireless Scene Switch 4 Gang 12 Mode
- **Purchase Link**: https://a.aliexpress.com/_EGhB7lS
- **Status**: ⚠️ **Works ONLY with Johan's app** (dependency issue)

### Symptoms
- Device only recognized when "app Johan" is enabled
- Does not pair with Universal Tuya Zigbee alone

### Current Driver
- **Path**: `drivers/scene_controller_4button_cr2032/`
- **Coverage**: 75 manufacturer IDs in driver.compose.json

### Root Cause Analysis

This is likely one of two issues:

#### A. Missing Manufacturer ID
The AliExpress variant uses a manufacturer ID not in our list.

**Current IDs** (scene_controller_4button_cr2032):
- `_TZ3000_*` series (21 IDs)
- `_TZE200_*` series (5 IDs)
- `TS004*` product IDs

**Missing Possibility**: 
- New `_TZE284_*` ID
- New `_TZ3210_*` ID
- Custom product ID variant

#### B. Conflicting Driver Priority
Johan's app may have a more generic matcher that catches the device first.

**Solution**: Increase specificity of our driver by:
1. Adding exact manufacturer ID
2. Setting `"discoveryStrategy": "userInteraction"` if needed
3. Verifying `productId` matches

### Required Actions

#### 1. Get Exact Fingerprint
```markdown
@[User] - For the 4-Gang Scene Switch:

Please try this:
1. Disable Johan's Tuya app temporarily
2. Factory reset the switch (hold bottom-left button 10s)
3. Start pairing in Universal Tuya Zigbee
4. If pairing fails, enable Developer Mode and check:
   - What manufacturer ID is shown?
   - What product ID is shown?
5. Share this info + a diagnostic report
```

#### 2. Check for DP-Based Commands
Some scene switches use TS0601 with DP commands instead of standard Zigbee On/Off:

```javascript
// If TS0601 variant:
{
  "profile": "scene_controller_4gang.ts0601.v1",
  "dpMap": {
    "button1": 1,
    "button2": 2,
    "button3": 3,
    "button4": 4,
    "mode": 101  // 12 mode selector
  }
}
```

#### 3. Add Mode Switching Support
The "12 Mode" feature may require:
```javascript
// Add capability for mode selection
"capabilities": [
  "onoff",
  "button.2", 
  "button.3",
  "button.4",
  "measure_battery",
  "scene_mode"  // NEW: 12 scene modes
]

// Settings for mode configuration
{
  "id": "scene_mode",
  "type": "dropdown",
  "label": "Scene Mode",
  "values": [
    { "id": "1", "label": "Mode 1: Single Press" },
    { "id": "2", "label": "Mode 2: Double Press" },
    // ... up to Mode 12
  ]
}
```

#### 4. Verify No Pairing Conflicts
Ensure driver doesn't overlap with Johan's matcher:
```javascript
// Check if we need more specific matching
"zigbee": {
  "manufacturerName": ["_TZ3000_SPECIFIC_ID"],  // Not wildcard
  "productId": ["TS0044"],                       // Exact match
  "endpoints": {
    "1": {
      "clusters": [0, 1, 3, 6],  // Must have all
      "bindings": [1]
    }
  }
}
```

---

## 🔴 PRODUCT 3: Motion & SOS Button (General)

### Status
✅ **Already covered in main prompt** (`WINDSURF_AI_PROMPT.md`)

### Quick Reference
- **Diagnostic ID**: `54e90adf-069d-4d24-bb66-83372cadc817`
- **User Quote**: "Still no Motion and SOS triggered data"
- **Root Cause**: `v.replace is not a function` in IAS Zone enrollment
- **Fix Location**: Main prompt Section 1 (IAS Zone Fixes)

### Key Fix Points (from main prompt)
1. Safe string handling in `IASZoneEnroller.js`
2. Wait for Zigbee ready before enrollment
3. Retry wrapper for timeout protection
4. Battery conversion 0..200 → % 
5. Remove orphaned catch blocks

---

## 📋 IMMEDIATE ACTIONS (Priority Order)

### Step 1: Fix General Issues (Main Prompt)
Execute **all fixes from `WINDSURF_AI_PROMPT.md`** first:
- IAS Zone enrollment fixes
- Battery conversion standardization
- Illuminance log-lux conversion
- CI/CD + templates setup

### Step 2: Request Missing Info (Forum)
Post in forum thread #407:

```markdown
Hi @Peter_van_Werkhoven and all testers,

Thanks for the detailed reports! I've identified several issues and have fixes ready.

**For those with failing devices, please help by providing:**

🔍 **Radar mmWave Sensor (AliExpress)**
- Diagnostic report with device paired
- Screenshot of Developer Tools → Advanced tab

🔍 **4-Gang Scene Switch (AliExpress)**  
- Temporarily disable Johan's app
- Factory reset switch + attempt pairing
- Share manufacturer ID + product ID from Developer Tools

📊 **General Motion/SOS Issues**
- Already diagnosed - fixes coming in v3.0.45

I'll add missing manufacturer IDs and release an update this weekend.

Best regards,
Dylan
```

### Step 3: Add Fingerprints When Received
Once users provide info:

**Radar Sensor**:
```json
// Add to lib/tuya-engine/fingerprints.json
{
  "manufacturerName": "_TZE284_XXXXXXXX",  // From user
  "modelId": "TS0601",
  "profile": "radar_th_motion.ts0601.v1"
}
```

**Scene Switch**:
```json
// Add to drivers/scene_controller_4button_cr2032/driver.compose.json
"manufacturerName": [
  // ... existing ...
  "_TZE284_YYYYYYYY"  // From user
]
```

### Step 4: Test & Release
1. Add fingerprints
2. Run `homey app validate --level publish`
3. Test with users (if possible)
4. Commit: `feat(devices): Add AliExpress Radar mmWave + Scene Switch 4G variants`
5. Release v3.0.45+

---

## 🔗 LINKS & RESOURCES

### Forum
- **Thread #407**: https://community.homey.app/t/app-pro-universal-tuya-zigbee-device-app-test/140352/407
- **User**: @Peter_van_Werkhoven
- **Diagnostic**: `54e90adf-069d-4d24-bb66-83372cadc817`

### Products
- **Radar mmWave**: https://a.aliexpress.com/_EuHhvD2
- **Scene Switch 4G**: https://a.aliexpress.com/_EGhB7lS

### Technical References
- **TS0601 DP Guide**: https://zigbee.blakadder.com/tuya.html
- **Zigbee2MQTT Device DB**: https://www.zigbee2mqtt.io/supported-devices/
- **Home Assistant ZHA**: https://github.com/zigpy/zha-device-handlers

---

## ✅ ACCEPTANCE CRITERIA (Addendum)

Before marking these products as "fixed":

- [ ] User confirms device pairs successfully
- [ ] User confirms all sensors report data (motion, temp, humidity, battery)
- [ ] Scene switch works without Johan's app enabled
- [ ] No `v.replace` errors in diagnostic logs
- [ ] Battery shows 0-100% correctly
- [ ] Motion triggers flows reliably
- [ ] Scene buttons 1-4 all respond
- [ ] Diagnostic report shows no errors for these devices

---

## 💬 COMMUNICATION TEMPLATE (Forum Response)

```markdown
## Update: Fixes for AliExpress Devices (v3.0.45)

Hi everyone,

I've analyzed the failing devices from @Peter_van_Werkhoven and others. Here's the status:

### ✅ Fixed (v3.0.45)
- **Motion/SOS not triggering**: Fixed IAS Zone enrollment errors
- **Battery 0% or 200%**: Standardized conversion
- **"v.replace is not a function"**: Safe string handling added

### ⏳ Needs Info (Please help!)
- **Radar mmWave (AliExpress)**: Need diagnostic report + manufacturer ID
- **Scene Switch 4-Gang (AliExpress)**: Need exact fingerprint

**How to help:**
1. Pair the device
2. Developer Tools → Devices → [Device] → "Advanced"
3. Screenshot the info OR create diagnostic report
4. Post diagnostic ID here

I'll add missing IDs and release an update within 48 hours of receiving info.

### 📥 Install Test Version
Update to v3.0.45 (beta) and test - feedback appreciated!

Thanks for your patience and testing!
Dylan
```

---

END OF ADDENDUM
