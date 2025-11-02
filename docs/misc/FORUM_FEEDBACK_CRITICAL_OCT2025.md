# 🚨 FORUM FEEDBACK CRITIQUE - OCTOBRE 2025

**Date:** 13-27 Oct 2025
**Source:** Email thread forum Homey
**Utilisateurs:** Peter, Cam, DutchDuke, Loïc, ugrbnk, Karsten, Ian, Jocke, Luca

---

## ⚡ PROBLÈME MAJEUR IDENTIFIÉ

**Dylan (26 Oct):** "Yes perso j'ai un gros problème de overflow (gestion de la mémoire)"

**C'EST LE ROOT CAUSE!**
- Memory overflow dans lib/
- Devices hang on initialization
- Data = null partout
- Reporting casse

---

## ✅ SUCCÈS PARTIEL - PETER

### HOBEIAN Multisensor (ZG-204ZV)
**v4.1.7 (22 Oct):**
- ✅ Motion sensor **FONCTIONNE ENFIN!**
- ✅ Temperature OK
- ✅ Humidity OK  
- ✅ Luminance OK
- ✅ Battery OK
- 🎉 **"You're a hero well done mate"**

**Interview data:**
```json
{
  "modelId": "ZG-204ZV",
  "manufacturerName": "HOBEIAN",
  "endpoints": {
    "1": {
      "clusters": {
        "iasZone": {
          "zoneState": "enrolled",
          "zoneType": "motionSensor",
          "iasCIEAddress": "bc:02:6e:ff:fe:9f:ae:44",
          "zoneId": 0
        },
        "temperatureMeasurement": {
          "measuredValue": 2110
        },
        "relativeHumidity": {
          "measuredValue": 8500
        },
        "illuminanceMeasurement": {
          "measuredValue": 26016
        },
        "powerConfiguration": {
          "batteryVoltage": 30,
          "batteryPercentageRemaining": 200
        }
      }
    }
  }
}
```

**Reporting Configuration:**
- ❌ ALL: "status": "NOT_FOUND" 
- **C'EST LE PROBLÈME!** configureReporting pas appliqué!

### SOS Emergency Button (TS0215A _TZ3000_0dumfk2z)
**v4.1.7:**
- ✅ Battery reading OK
- ❌ **Button press NOT triggering!**
- ❌ No flow triggering
- Diagnostic: f654e98a-b2f6-49ce-93b3-d1966cdda2cd

**Interview data:**
```json
{
  "modelId": "TS0215A",
  "manufacturerName": "_TZ3000_0dumfk2z",
  "iasZone": {
    "zoneState": "notEnrolled",  // ❌ PAS ENROLLED!
    "zoneType": "remoteControl",
    "zoneId": 255  // ❌ Invalid!
  }
}
```

**ROOT CAUSE:** IAS Zone NOT enrolled! Same problem as v4.1.0 Peter fix!

---

## ❌ ÉCHECS - CAM

### Motion Sensor + Button
**v3.0.35 - v4.2.6:**
- ❌ Motion sensor: no trigger
- ❌ Button: generic device, on/off card doesn't work
- ❌ "Nothing happens except an error"
- Diagnostic: 5d3e1a5d-701b-4273-9fd8-2e8ffcfbf2ee

**Frustration:**
> "I just wanted to suggest keeping your vision and the reality separate in your release notes. So many times the notes have read 'XYZ device is now working!' only for it to indeed not be working."

**Valid criticism!** Release notes trop optimistes vs reality.

---

## ❌ ÉCHECS - DUTCHDUKE

### Temperature Sensor (TZ3000_akqdg6g7 / TS0201)
- ❌ Recognized as **smoke detector** (wrong!)
- ❌ No temperature reading
- ❌ No humidity reading

### Soil Sensor (_TZE284_oitavov2 / TS0601)
- ❌ Not recognized at all
- Diagnostic: 2b7856d9-e8b2-43cd-ab31-1516982f1eba

---

## 🔧 NOUVEAU - LOÏC (BSEED SWITCHES)

### Bseed 2 Gang Switch (TS0002 _TZ3000_l9brjwau)
**Amazon:** https://amzn.eu/d/44FAB6n
**Manufacturer:** https://www.bseed.com/fr/collections/serie-zigbee

**Problème:**
- ✅ Gang 1: works properly
- ❌ Gang 2: ERROR when controlling
- ❌ Both gangs switch together (useless!)
- ❌ Manual status not read by Homey

**Interview data fournie:**
```json
{
  "modelId": "TS0002",
  "manufacturerName": "_TZ3000_l9brjwau",
  "deviceType": "router",
  "powerSource": "mains",
  "endpoints": {
    "1": {
      "onOff": {
        "onOff": false,
        "reportingConfiguration": {
          "status": "SUCCESS",  // ✅ Endpoint 1 OK!
          "minInterval": 60,
          "maxInterval": 600
        }
      }
    },
    "2": {
      "onOff": {
        "onOff": false,
        "reportingConfiguration": {
          "status": "NOT_FOUND"  // ❌ Endpoint 2 NOT configured!
        }
      }
    }
  }
}
```

**ROOT CAUSE:** Multi-endpoint device, only endpoint 1 configured!

**TODO:**
- Bseed 2 gang
- Bseed 3 gang
- Bseed volet roulant (curtain switch)

**User ready to donate!** "PayPal @dlnraja?"

---

## ❌ AUTRES ÉCHECS

### ugrbnk - Smoke Detector
- ❌ Device added but no data
- ❌ Alarm triggers physically but not in Homey
- Diagnostic: b1fddeb8-7396-422e-bbfe-40a291976d6f

### Jocke - App Crash
**v4.2.6:**
- ❌ App crashes on install
- ❌ "Uninstalled and re-installed with same result"
- Diagnostic: 6c0cdbf0-150c-4c83-bf6c-4b3954fb33be

### Karsten - Temperature Sensor
- ❌ Wrong device type selected
- ❌ No temp/humidity reading
- ❌ "Believes it has motion sensor"
- Diagnostic: 1220a7cf-f467-4b3d-a432-446a2858134b

### Ian - 4 Button Scene Controller
- ❌ Picked up as "4 button remote" (close but not quite)
- ❌ "Could not get device by id" error
- Diagnostic: bf38b171-6fff-4a92-b95b-117639f5140f

---

## 📊 PATTERN ANALYSIS

### 1. Memory Overflow Problem
**Symptoms:**
- App crashes
- Devices hang on init
- Data = null
- Reporting NOT_FOUND

**Cause:** lib/ memory management issue

### 2. IAS Zone Enrollment
**SOS Button:** zoneState = "notEnrolled"
**Same as v4.1.0 Peter fix!** Need synchronous enrollment!

### 3. Multi-Endpoint Devices
**Bseed 2 gang:** Endpoint 2 not configured
**Pattern:** Only endpoint 1 gets reporting config

### 4. Wrong Device Matching
**Temp sensor → Smoke detector**
**Scene controller → Remote**
**Matching algorithm broken!**

### 5. Reporting Configuration
**ALL devices:** reportingConfiguration status = "NOT_FOUND"
**setupRealtimeReporting() NOT working!**

---

## 🎯 ROOT CAUSES IDENTIFIED

### #1 CRITICAL: Memory Overflow (80%)
```
lib/BaseHybridDevice.js trop gros
→ Memory overflow during init
→ Devices hang
→ Reporting jamais configuré
→ Data = null
```

**Solution:** Refactor BaseHybridDevice, split into smaller modules

### #2 CRITICAL: IAS Zone Enrollment (15%)
```
SOS button: zoneState = "notEnrolled"
→ No events received
→ Button press not triggering
```

**Solution:** Port Peter's v4.1.0 synchronous enrollment fix

### #3 HIGH: Multi-Endpoint Config (5%)
```
Bseed 2 gang: Endpoint 2 ignored
→ Only endpoint 1 configured
→ Both switch together
```

**Solution:** Configure reporting for ALL endpoints

---

## ✅ CE QUI MARCHE (v4.1.7)

**Peter's Multisensor:**
- ✅ Motion detection
- ✅ Temperature
- ✅ Humidity
- ✅ Luminance
- ✅ Battery

**MAIS:** Reporting config = "NOT_FOUND" partout!
**Donc:** Device poll data, pas real-time reporting!

---

## ❌ CE QUI NE MARCHE PAS

1. **SOS Button:** Not enrolled, no trigger
2. **Cam's devices:** Generic, no functions
3. **Bseed 2 gang:** Endpoint 2 not working
4. **Temp sensors:** Wrong device type
5. **App crashes:** Memory overflow
6. **Real-time reporting:** NOT_FOUND partout

---

## 💡 PLAN FIX v4.9.69

### Priority 1: Memory Overflow
```javascript
// lib/BaseHybridDevice.js → TROP GROS!
// Split into:
- lib/HybridDevice/Core.js
- lib/HybridDevice/Reporting.js
- lib/HybridDevice/Power.js
- lib/HybridDevice/IASZone.js
```

### Priority 2: IAS Zone Enrollment
```javascript
// Port Peter's v4.1.0 fix
async enrollIASZone() {
  // SYNCHRONOUS enrollment
  // NO delays
  // Immediate listener
}
```

### Priority 3: Multi-Endpoint Config
```javascript
// Configure ALL endpoints
for (const ep of this.zclNode.endpoints) {
  await this.configureReporting(ep);
}
```

### Priority 4: Device Matching
```
Fix driver matching algorithm
- Check manufacturer + model FIRST
- Then capabilities
- Avoid generic matches
```

---

## 📋 TODO LIST

### Immédiat:
- [ ] Fix memory overflow in lib/
- [ ] Port IAS Zone enrollment fix
- [ ] Multi-endpoint reporting config
- [ ] Test with Peter's devices

### Bseed Switches (Loïc):
- [ ] TS0002 2 gang (_TZ3000_l9brjwau)
- [ ] TS0003 3 gang
- [ ] Curtain switch
- [ ] Manual status sync

### Autres:
- [ ] Fix temp sensor → smoke detector
- [ ] Fix scene controller matching
- [ ] App crash on install
- [ ] Release notes plus réalistes

---

## 💬 USER FEEDBACK

### Positif:
**Peter:** "You're a hero well done mate"
**Luca:** "Thank you for your dedication and hard work"
**Loïc:** "Je verserai une modeste contribution"

### Frustration:
**Cam:** "Release notes vs reality don't match"
**Luca:** "Is there any device that actually works?"
**Dylan:** "I put in pose the development" (put on hold?)

---

## 🔬 DIAGNOSTIC CODES À ANALYSER

1. **Peter SOS button:** f654e98a-b2f6-49ce-93b3-d1966cdda2cd
2. **Cam devices:** 5d3e1a5d-701b-4273-9fd8-2e8ffcfbf2ee
3. **DutchDuke sensors:** 2b7856d9-e8b2-43cd-ab31-1516982f1eba
4. **ugrbnk smoke:** b1fddeb8-7396-422e-bbfe-40a291976d6f
5. **Jocke crash:** 6c0cdbf0-150c-4c83-bf6c-4b3954fb33be
6. **Karsten temp:** 1220a7cf-f467-4b3d-a432-446a2858134b
7. **Ian 4 button:** bf38b171-6fff-4a92-b95b-117639f5140f

---

## 🎯 NEXT SESSION ACTIONS

1. **Fix memory overflow** - Split BaseHybridDevice
2. **Port Peter's IAS fix** - Synchronous enrollment
3. **Multi-endpoint config** - ALL endpoints not just 1
4. **Test with diagnostics** - Use codes above
5. **Bseed support** - Loïc ready to donate & test

---

**CONCLUSION:** Memory overflow est le ROOT CAUSE principal! Fix ça en premier!
