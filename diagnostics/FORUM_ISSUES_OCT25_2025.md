# Forum Issues - October 25, 2025

## 🔥 PROBLÈMES CRITIQUES EN COURS

### 1. Peter van Werkhoven - HOBEIAN Multi-Sensor & SOS Button
**Status:** 🔴 PARTIALLY FIXED
**Devices:**
- Multi-sensor ZG-204ZV (HOBEIAN): ✅ Temperature, Humidity, Lux work | ❌ Motion not triggering
- SOS Button TS0215A (_TZ3000_0dumfk2z): ✅ Battery reading | ❌ Button press not triggering

**Diagnostic Codes:**
- Multi-sensor: 23ff6ed3-06c0-4865-884f-bc6ac1a6b159 (v4.1.7)
- SOS Button: f654e98a-b2f6-49ce-93b3-d1966cdda2cd (v4.1.7)

**Interview Data:**
```json
Multi-sensor:
- iasZone: zoneState: "enrolled", zoneType: "motionSensor"
- Clusters: basic(0), identify(3), iasZone(1280), temperatureMeasurement(1026), 
  relativeHumidity(1029), powerConfiguration(1), illuminanceMeasurement(1024)

SOS Button:
- iasZone: zoneState: "notEnrolled", zoneType: "remoteControl"
- Needs zone enrollment
```

**Root Cause:**
- Multi-sensor: IAS Zone enrolled but events not reaching capability
- SOS Button: Not enrolled in IAS Zone - needs enrollment sequence

**Action Required:**
- [ ] Fix IAS Zone event handling in motion sensor driver
- [ ] Add proactive zone enrollment for SOS button
- [ ] Test with both devices

---

### 2. Cam - Motion Sensor & Scene Button
**Status:** 🔴 NOT WORKING
**Devices:**
- Motion Sensor ZG-204ZL: Not detecting motion
- Scene Button (1-button wireless): Not recognized correctly

**Diagnostic Code:** 5d3e1a5d-701b-4273-9fd8-2e8ffcfbf2ee

**Issue:**
- Generic device cards show error when pressed
- Motion sensor onoff card doesn't work

**Action Required:**
- [ ] Verify ZG-204ZL manufacturer ID in motion sensor drivers
- [ ] Fix scene button driver selection
- [ ] Add proper flow cards for these devices

---

### 3. DutchDuke - Temperature Sensor & Soil Sensor
**Status:** 🔴 NOT WORKING  
**Devices:**
- Temperature/Humidity Sensor: Recognized as smoke detector (WRONG!)
  - _TZ3000_akqdg6g7 / TS0201
- Soil Sensor: Not recognized at all
  - _TZE284_oitavov2 / TS0601

**Diagnostic Codes:**
- Temp sensor: 8e499883-6e7e-4498-a63a-46fdcb79c42c (v2.15.91)
- Soil sensor: 63d8fadd-7bc1-4c23-ac43-7b973b89c605

**Action Required:**
- [ ] Fix _TZ3000_akqdg6g7 driver mapping (temp sensor not smoke!)
- [ ] Add _TZE284_oitavov2 to soil sensor driver
- [ ] Add TS0601 support for soil moisture

---

### 4. Ian Gibbo - 4-Button Switch
**Status:** 🔴 ERROR
**Device:** 4-way switch
**Issue:** "Could not get device by id" error

**Diagnostic Code:** bf38b171-6fff-4a92-b95b-117639f5140f

**Action Required:**
- [ ] Fix 4-button remote/scene controller driver
- [ ] Investigate device ID retrieval error
- [ ] Test pairing process

---

### 5. Karsten Hille - Temperature Sensor Misidentified
**Status:** 🔴 WRONG DRIVER
**Issue:** Temperature sensor detected with motion sensor capability

**Diagnostic Code:** 1220a7cf-f467-4b3d-a432-446a2858134b

**Action Required:**
- [ ] Fix driver detection heuristics
- [ ] Prevent motion capability on temp-only sensors

---

### 6. Jocke Svensson - App Crash on Install
**Status:** 🔴 CRITICAL
**Issue:** App crashes immediately after installation

**Diagnostic Code:** 6c0cdbf0-150c-4c83-bf6c-4b3954fb33be (v4.2.6)

**Action Required:**
- [ ] Review app.js for initialization errors
- [ ] Add error handling to prevent crash
- [ ] Test clean install scenario

---

### 7. Loïc Salmona - Bseed 2-Gang Switch ✅ FIXED
**Status:** ✅ FIXED (Oct 25, 2025)
**Device:** Bseed TS0002 (_TZ3000_l9brjwau)
**Issue:** Gang 1 works, Gang 2 throws error, manual status not read

**Solution Applied:**
- Fixed capability naming: `onoff.switch_2` → `onoff.gang2`
- Fixed device.js: `switchCount` → `gangCount`
- Added proper capabilitiesOptions for gang2
- Multi-endpoint reporting now configured correctly

**Files Modified:**
- `drivers/switch_wall_2gang/driver.compose.json`
- `drivers/switch_wall_2gang/device.js`

---

## 📊 STATISTIQUES PROBLÈMES

**Total Issues:** 7
**Critical:** 2 (App crash, Multiple device failures)
**High Priority:** 4 (Peter, Cam, DutchDuke, Ian)
**Fixed:** 1 (Loïc Bseed switch)

**Types de Problèmes:**
- IAS Zone Issues: 2 (Motion sensor, SOS button)
- Wrong Driver Detection: 2 (Temp as smoke, motion on temp)
- Device Not Recognized: 2 (Soil sensor, scene button)
- Multi-Endpoint Issues: 1 (Fixed - 2-gang switch)
- App Stability: 1 (Crash on install)

---

## 🎯 PRIORITÉS D'ACTION

### P0 - CRITICAL (App Crash)
1. Fix app.js initialization crash

### P1 - HIGH (Multiple Users Affected)
2. Fix IAS Zone event handling (Peter's motion sensor)
3. Fix IAS Zone enrollment (Peter's SOS button)
4. Fix driver detection (DutchDuke temp sensor)

### P2 - MEDIUM (Single User Impact)
5. Add soil sensor support (DutchDuke)
6. Fix 4-button switch (Ian)
7. Fix scene button detection (Cam)
8. Fix motion sensor for ZG-204ZL (Cam)

---

## 📝 NOTES

**Community Feedback:**
- Luca: Questions if any devices work properly (frustration with general reliability)
- Peter: Very patient, providing excellent diagnostic data
- Ian: Notes difficulty in collaborative development
- Cam: Suggests keeping release notes realistic vs aspirational

**Athom Silence:**
- Community frustrated with lack of official Tuya support from Athom/LG
- Volunteers doing all the work alone

**User Sentiment:** 
- Mixed - Some progress visible (Peter's temp working)
- General frustration with many devices still not working
- Appreciation for effort but need faster fixes
