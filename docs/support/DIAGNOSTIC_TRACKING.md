# Diagnostic Reports Tracking

**Purpose:** Track and respond to user diagnostic reports systematically

---

## 📊 Active Diagnostics

### 🔴 CRITICAL: IAS Zone Crash Users (v3.0.23) - UPDATE NEEDED!

**Crash Error:** `Error: Zigbee is aan het opstarten. Wacht even en probeer het opnieuw.`  
**Date:** Oct 16, 2025 @ 21:15 & 01:41  
**App Version:** v3.0.23 (OLD!)  
**Homey Version:** v12.8.0  
**Device:** SOS Emergency Button (`sos_emergency_button_cr2032`)

**Root Cause:** Proactive `zoneEnrollResponse()` call during `onNodeInit()` - **FIXED in v3.0.37!**  
**Stack Trace:**
```
Error: Zigbee is aan het opstarten
at IASZoneEnroller.setupZoneEnrollListener (/app/lib/IASZoneEnroller.js:76:40)
at IASZoneEnroller.enroll (/app/lib/IASZoneEnroller.js:316:14)
at SOSEmergencyButtonDevice.onNodeInit
```

**Status:** ✅ **FIXED IN v3.0.37** (listener-only approach per Homey SDK)  
**Response Required:** ⚠️ **Email users to UPDATE to v3.0.37+**

**Affected Users:**
- All users with IAS Zone devices (motion sensors, contact sensors, SOS buttons)
- Running v3.0.23 or earlier
- Experiencing crashes on Homey restart

**Action Items:**
- [x] Fix implemented (v3.0.37)
- [x] Pushed to GitHub
- [ ] 🔥 **EMAIL USERS: Critical update available**
- [ ] Monitor for new crash reports

---

### 1. SOS Button + Multisensor Pairing Issue

**Log ID:** `27752b0b-0616-4f1d-9cb4-59982935ad9b`  
**Date:** Oct 16, 2025 @ 19:36  
**App Version:** v3.0.23 (⚠️ OLD - has IAS Zone crash bug!)  
**Homey Version:** v12.8.0  
**User Message:** "SOS button is not Triggering the app battery reading okay. Multisensor not been able to add anymore, it keeps blinking and can't get connected, and then says device already added while it's not listed."

**Devices Identified:**
- ✅ **SOS Emergency Button** - Paired successfully, battery OK (96%), IAS Zone enrolled via auto-enroll
- ❌ **Multisensor** - Pairing fails (ghost device)

**Analysis:**
- SOS button shows successful init:
  - Battery: 96% ✅
  - IAS Zone: Enrolled via AUTO-ENROLLMENT ✅
  - Listeners: Configured ✅
- BUT user running v3.0.23 = **IAS Zone crash risk!**
- Multisensor: Classic "ghost device" - paired in Zigbee network but not added to Homey

**Root Causes:**
1. **SOS Button:** Working BUT v3.0.23 has IAS Zone crash bug → Update to v3.0.37!
2. **Multisensor:** Ghost device - needs Zigbee reset + re-pair

**Status:** ⏳ Awaiting user response  
**Response Required:** Email with:
1. ⚠️ **UPDATE TO v3.0.37** (critical IAS Zone fix)
2. Ghost device fix: Remove from Zigbee network, factory reset, re-pair
3. Request manufacturer IDs for both devices
4. Ask for new diagnostic after update

**Next Steps:**
- [ ] Email user (priority: update warning)
- [ ] User updates to v3.0.37+
- [ ] User factory resets multisensor
- [ ] User provides manufacturer IDs
- [ ] Verify fix works

---

### 2. Gas Sensor (TS0601) - Standard Init

**Log ID:** `a063a142-b657-42f0-8f0a-622c8674e53f`  
**Date:** Oct 16, 2025 @ 19:58  
**App Version:** v3.0.23 (⚠️ OLD)  
**User Message:** "Diagnostic report"  
**Device:** Gas Sensor (TS0601) - `_TZ3400_xxxxx` likely

**Analysis:**
```
2025-10-16T19:58:37.699Z [log] gas_sensor_ts0601_ac initialized
2025-10-16T19:58:37.701Z [log] [TuyaCluster] No Tuya cluster found on any endpoint
2025-10-16T19:58:37.701Z [log] No Tuya cluster found, using standard Zigbee
2025-10-16T19:58:37.701Z [log] AC powered gas sensor - no battery registration needed
```

- ✅ Device initialized successfully
- ⚠️ "No Tuya cluster found" - device using standard Zigbee (expected for some TS0601)
- ✅ AC powered detection working
- ❓ No user-reported issue - likely testing diagnostic system

**Status:** ⏳ Need clarification - log shows success, no error  
**Response Required:** Ask user:
1. What specific issue are you experiencing?
2. Is gas sensor reporting values correctly?
3. Update to v3.0.37+ (general recommendation)
4. Provide manufacturer ID

**Next Steps:**
- [ ] Email user for clarification
- [ ] If working: No action needed
- [ ] If not working: Request active diagnostic

---

### 3. "The whole app doesn't work" (Generic)

**Log ID:** `5d3e1a5d-701b-4273-9fd8-2e8ffcfbf2ee`  
**Date:** Oct 16, 2025 @ 22:31  
**App Version:** v3.0.35 (recent)  
**Homey Version:** v12.8.0  
**User Message:** "The whole app doesn't work"

**Issue:** Vague complaint, log shows clean initialization  
**Analysis:** App initialized successfully, all 183 drivers loaded, no errors. Likely device-specific issue, not app-wide.  
**Status:** ⏳ Need user clarification  
**Response:** `EMAIL_TO_CAM.txt` or generic template

**Next Steps:**
- [ ] Request specific symptoms
- [ ] Request manufacturer IDs
- [ ] Request active diagnostic (testing specific device)

---

### 4. Temperature Sensor Issues (Multiple Reports)

**Log IDs:** Various (cf04e00e, 6c8e96e2, f7f91827, 906cebef, cf19866c, 79185556, cbfd89ec, 53c593a8)  
**Date:** Oct 15-16, 2025  
**Common Messages:**
- "Temperature sensor identified incorrectly"
- "No reading"
- "Temp reading now, rest no data last 5 days"
- "Only temperature data and no battery level"

**Pattern Analysis:**
- Multiple users reporting temp sensors not working fully
- Battery reporting issues
- Partial data (temp yes, humidity/battery no)

**Status:** 🔧 Investigation needed  
**Suspected Causes:**
1. Missing manufacturer IDs
2. Wrong driver selected (similar fingerprints)
3. Battery cluster not configured
4. TS0601 Tuya cluster parsing issues

**Action Items:**
- [ ] Email each user for manufacturer IDs
- [ ] Check driver compatibility
- [ ] Verify battery cluster configuration
- [ ] Test with actual device if possible

---

### 5. Zigbee Timeout Error

**Date:** Oct 16, 2025 @ 21:15  
**App Version:** v3.0.23  
**Error:** `Error: Timeout: Expected Response at Timeout._onTimeout (/app/node_modules/zigbee-clusters/lib/Cluster.js:966:16)`

**Analysis:**
- Zigbee command timeout (device not responding)
- Could be: weak signal, sleeping device, network congestion
- Non-critical unless frequent

**Status:** ⏸️ Monitor - single occurrence, likely transient  
**Response:** No action unless user reports repeated issues

---

## 📬 Community Interviews (Ian Gibbo)

### Interview Data Received (Oct 17, 2025)

**Purpose:** Add manufacturer IDs to improve device support

#### 1. Philips Hue Smart Plug (LOM003)
- **Model:** `LOM003`
- **Manufacturer:** `Signify Netherlands B.V.`
- **IEEE:** `00:17:88:01:08:e6:9d:95`
- **Type:** Router (AC powered)
- **Status:** ✅ Has dedicated Philips app ("Hue without bridge" by Johan)
- **Action:** ⏸️ No action - not a Tuya device

#### 2. Tuya 2-Gang Switch (TS0002)
- **Model:** `TS0002`
- **Manufacturer:** `_TZ3000_h1ipgkwn` ⭐
- **IEEE:** `a4:c1:38:fe:3d:c3:0f:75`
- **Type:** Router (AC powered)
- **Endpoints:** 2 (dual gang)
- **Clusters:** onOff, metering, electricalMeasurement
- **Status:** 🔍 Check if `_TZ3000_h1ipgkwn` in drivers/
- **Action:** 
  - [ ] Verify manufacturer ID coverage
  - [ ] Add to `switch_2gang_ac` if missing

#### 3. HOBEIAN Motion Sensor (ZG-204ZV)
- **Model:** `ZG-204ZV`
- **Manufacturer:** `HOBEIAN` ⭐
- **IEEE:** `a4:c1:38:b8:a6:e5:42:79`
- **Type:** End device (battery)
- **Clusters:** IAS Zone (motion sensor), illuminanceMeasurement, powerConfiguration
- **Battery:** 200 (100% = CR2032)
- **IAS Zone:** ✅ Enrolled (zoneId: 0)
- **Status:** 🔍 Check if `HOBEIAN` in motion sensor drivers
- **Action:**
  - [ ] Search drivers for "HOBEIAN"
  - [ ] Add to motion_sensor_battery if missing
  - [ ] Note: Has illuminance sensor (33598 lux reading)

#### 4. TS0601 Battery Device
- **Model:** `TS0601`
- **Manufacturer:** `_TZE284_1lvln0x6` ⭐
- **IEEE:** `a4:c1:38:ca:5b:2b:86:a1`
- **Type:** End device (battery)
- **Clusters:** Basic, groups, scenes, Tuya cluster (60672)
- **Status:** 🔍 TS0601 = proprietary Tuya - check existing support
- **Action:**
  - [ ] Identify device type (sensor? button?)
  - [ ] Check TS0601 handler compatibility
  - [ ] Add manufacturer ID if supported type

#### 5. TS0012 Battery Switch
- **Model:** `TS0012`
- **Manufacturer:** `_TZ3000_zmlunnhy` ⭐
- **IEEE:** `a4:c1:38:b6:32:39:b9:a0`
- **Type:** End device (battery) - ⚠️ Unusual for switch!
- **Endpoints:** 2 (dual gang)
- **Clusters:** onOff (basic switching)
- **Power:** Battery (unusual for TS0012 - usually AC)
- **Status:** 🔍 Battery-powered switch = wireless scene controller?
- **Action:**
  - [ ] Check if TS0012 battery variant exists
  - [ ] May be misidentified - could be wireless button
  - [ ] Verify correct driver mapping

---

## 📝 Response Templates Available

| Template | Use Case | Location |
|----------|----------|----------|
| **EMAIL_TO_CAM.txt** | Detailed response for Cam (button + motion) | `docs/support/` |
| **EMAIL_TO_CAM_SHORT.txt** | Concise version for Cam | `docs/support/` |
| **TEMPLATE_GENERIC_DIAGNOSTIC.txt** | Generic diagnostic response | `docs/support/` |

---

## 🔧 Common Diagnostic Patterns

### Pattern 1: "App doesn't work" but log shows clean init
**Cause:** User expects all devices to work, but specific device has issue  
**Response:** Request manufacturer IDs + device-specific symptoms  
**Fix:** Add manufacturer ID support or fix driver implementation

### Pattern 2: IAS Zone enrollment failures (motion/contact sensors)
**Symptoms:** Sensor paired but no events, `alarm_*` capability missing  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Response:** Point to `docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/docs/fixes/PETER_IAS_ZONE_FIX_COMPLETE.md`  
**Fix:** Re-pair within 2m, wait 60s for enrollment

### Pattern 3: TS0601 devices not initializing
**Symptoms:** Gas/leak/multi-sensors don't report values  
**Response:** Confirm v3.0.35 installed, point to TS0601 fix  
**Fix:** Re-pair after update (handler fixed in v3.0.17/3.0.35)

### Pattern 4: Flow card warnings (cosmetic)
**Example:** `Warning: Run listener was already registered`  
**Response:** Explain these are non-critical (duplicate registrations)  
**Fix:** Low priority - code cleanup when refactoring

### Pattern 5: Truncated logs
**Symptoms:** Email shows incomplete stdout/stderr  
**Response:** Request full log or new diagnostic while testing  
**Fix:** N/A (user-side issue)

---

## 📊 Statistics

**Total Diagnostics Received:** 12+ (Oct 15-17, 2025)  
**Critical Crashes:** 2 (IAS Zone bug - FIXED in v3.0.37)  
**Pending Responses:** 10  
**Resolved:** 1 (IAS Zone crash fix released)  
**Common Issues:**
- ❌ IAS Zone crash (v3.0.23) → ✅ Fixed in v3.0.37
- ⚠️ Temperature sensors reporting partial data
- ⚠️ Ghost devices (pairing failures)
- ⚠️ Battery reporting issues
- 🔍 Missing manufacturer IDs

**Action Priority:**
1. 🔴 **EMAIL v3.0.23 users: Critical update to v3.0.37**
2. 🟡 Respond to temperature sensor issues
3. 🟡 Process Ian Gibbo's manufacturer IDs
4. 🟢 Respond to generic diagnostics

---

## 🚀 Workflow

### When New Diagnostic Arrives

1. **Log it here** with:
   - Log ID
   - Date/time
   - User message
   - App/Homey version

2. **Analyze:**
   - Check for errors in stdout/stderr
   - Identify device type (if mentioned)
   - Look for patterns (init failures, IAS Zone, TS0601, etc.)

3. **Respond:**
   - Use appropriate template
   - Request manufacturer IDs (always)
   - Request active diagnostic if needed
   - Provide quick fixes

4. **Track:**
   - Mark status: ⏳ Awaiting / 🔧 In Progress / ✅ Resolved
   - Update when user responds
   - Document solution

5. **Fix (if needed):**
   - Add manufacturer ID to driver
   - Fix driver implementation
   - Release patch version
   - Notify user

---

## 📧 Email Best Practices

✅ **DO:**
- Always request manufacturer IDs
- Provide quick fixes first (restart, re-pair)
- Link to relevant documentation
- Be friendly and professional
- Request active diagnostics (testing while logging)

❌ **DON'T:**
- Assume device is supported without checking
- Guess at solutions without manufacturer ID
- Ignore truncated logs (ask for full version)
- Overcomplicate initial response

---

**Last Updated:** Oct 17, 2025 @ 06:56

---

## 🎯 Immediate Actions Required

### Priority 1: Critical Update Notification
- [ ] Email all users running v3.0.23 or earlier
- [ ] Subject: "🔴 CRITICAL: Update to v3.0.37 - IAS Zone Crash Fix"
- [ ] Highlight: SOS buttons, motion sensors, contact sensors affected
- [ ] Include: Crash symptoms, fix explanation, update instructions

### Priority 2: Process Manufacturer IDs
- [ ] `_TZ3000_h1ipgkwn` (TS0002 switch)
- [ ] `HOBEIAN` (ZG-204ZV motion sensor)
- [ ] `_TZE284_1lvln0x6` (TS0601 battery device)
- [ ] `_TZ3000_zmlunnhy` (TS0012 battery switch)

### Priority 3: Temperature Sensor Investigation
- [ ] Collect all temperature sensor manufacturer IDs
- [ ] Verify battery cluster configuration
- [ ] Test TS0601 temperature sensors
- [ ] Document findings

### Priority 4: Respond to Pending Diagnostics
- [ ] SOS button user (27752b0b) - Update + ghost device fix
- [ ] Gas sensor user (a063a142) - Clarification request
- [ ] "App doesn't work" user (5d3e1a5d) - Specific symptoms request
- [ ] 8x temperature sensor users - Manufacturer ID requests
