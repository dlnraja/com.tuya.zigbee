# Ian Gibbo Interview Data Analysis
**Date:** October 17, 2025  
**Source:** Forum PM conversation  
**Total Devices:** 5

---

## 📋 DEVICES SUBMITTED

### ✅ Device #1: Smart Plug with Energy Monitoring
**Manufacturer ID:** `_TZ3000_00mk2xzy`  
**Model ID:** `TS011F`  
**Type:** Smart Plug AC Power  
**Power Source:** Mains  
**Capabilities:**
- onOff (cluster 6)
- metering (cluster 1794) - energy monitoring
- electricalMeasurement (cluster 2820) - voltage, current, power

**Interview Data:**
```json
{
  "manufacturerName": "_TZ3000_00mk2xzy",
  "modelId": "TS011F",
  "deviceType": "router",
  "powerSource": "mains",
  "clusters": {
    "onOff": true,
    "metering": { "currentSummationDelivered": 0 },
    "electricalMeasurement": {
      "rmsVoltage": 0,
      "rmsCurrent": 0,
      "activePower": 0
    }
  }
}
```

**Status:** ✅ **NEW ID - TO ADD**  
**Target Driver:** `smart_plug_ac`  
**Action:** Add manufacturer ID to driver

---

### ✅ Device #2: 2-Gang Switch with Energy Monitoring
**Manufacturer ID:** `_TZ3000_h1ipgkwn`  
**Model ID:** `TS0002`  
**Type:** Switch 2-Gang AC Power  
**Power Source:** Mains  
**Capabilities:**
- onOff gang 1 (endpoint 1, cluster 6)
- onOff gang 2 (endpoint 2, cluster 6)
- metering (cluster 1794) - energy monitoring
- electricalMeasurement (cluster 2820)

**Interview Data:**
```json
{
  "manufacturerName": "_TZ3000_h1ipgkwn",
  "modelId": "TS0002",
  "deviceType": "router",
  "powerSource": "mains",
  "endpoints": [1, 2],
  "clusters": {
    "onOff": true,
    "metering": true,
    "electricalMeasurement": true
  }
}
```

**Status:** ✅ **ALREADY ADDED**  
**Target Driver:** `switch_2gang_ac`  
**Action:** None - already integrated in previous session (commit 29cadfac4)

---

### ✅ Device #3: Motion Sensor with Illuminance (HOBEIAN)
**Manufacturer ID:** `HOBEIAN`  
**Model ID:** `ZG-204ZV`  
**Type:** Motion Sensor with Illuminance (Battery)  
**Power Source:** Battery  
**Capabilities:**
- alarm_motion (IAS Zone cluster 1280)
- measure_luminance (cluster 1024)
- measure_battery (cluster 1)

**Interview Data:**
```json
{
  "manufacturerName": "HOBEIAN",
  "modelId": "ZG-204ZV",
  "deviceType": "enddevice",
  "powerSource": "battery",
  "swBuildId": "0122052017",
  "clusters": {
    "iasZone": {
      "zoneType": "motionSensor",
      "zoneState": "enrolled"
    },
    "illuminanceMeasurement": {
      "measuredValue": 33598,
      "maxMeasuredValue": 4000
    },
    "powerConfiguration": {
      "batteryVoltage": 30,
      "batteryPercentageRemaining": 200
    }
  }
}
```

**Status:** ✅ **ALREADY PRESENT**  
**Target Driver:** `motion_sensor_illuminance_battery`  
**Action:** None - manufacturer ID already in driver (line 32)

---

### ⚠️ Device #4: Unknown TS0601 Battery Device
**Manufacturer ID:** `_TZE284_1lvln0x6`  
**Model ID:** `TS0601`  
**Type:** **UNKNOWN - REQUIRES CLARIFICATION**  
**Power Source:** Battery  
**Capabilities:**
- Tuya cluster 61184 (proprietary)
- No standard capabilities visible

**Interview Data:**
```json
{
  "manufacturerName": "_TZE284_1lvln0x6",
  "modelId": "TS0601",
  "deviceType": "enddevice",
  "powerSource": "battery",
  "clusters": {
    "groups": {},
    "scenes": {},
    "basic": { "appVersion": 80 }
  }
}
```

**Analysis:**
- TS0601 = Generic Tuya device using proprietary cluster 61184
- Battery powered
- NO temperature/humidity/motion/contact clusters visible
- Could be: button, leak sensor, valve controller, door lock, etc.

**Status:** ⏳ **PENDING USER CLARIFICATION**  
**Target Driver:** Unknown  
**Action Required:** Ask user what this device actually is

**Questions for User:**
1. What type of device is this physically?
2. What does it do? (sensor, button, controller?)
3. Does it report any data in Homey?
4. Can you provide product link or photo?

---

### 🔄 Device #5: Wireless Switch 2-Gang (Battery)
**Manufacturer ID:** `_TZ3000_zmlunnhy`  
**Model ID:** `TS0012`  
**Type:** Wireless Switch 2-Gang Battery (NOT AC Switch!)  
**Power Source:** **BATTERY** ⚠️  
**Capabilities:**
- onOff gang 1 (endpoint 1)
- onOff gang 2 (endpoint 2)
- Battery powered (unusual for TS0012!)

**Interview Data:**
```json
{
  "manufacturerName": "_TZ3000_zmlunnhy",
  "modelId": "TS0012",
  "deviceType": "enddevice",
  "powerSource": "battery",
  "receiveWhenIdle": false,
  "endpoints": [1, 2],
  "clusters": {
    "onOff": true,
    "groups": {},
    "scenes": {}
  }
}
```

**Analysis:**
- TS0012 normally = AC powered 2-gang switch
- THIS device = battery powered!
- `deviceType: "enddevice"` + `receiveWhenIdle: false` = battery
- AliExpress link confirms: "Tuya Smart WiFi/Zigbee Micro USB Adaptor Switch 5V Mini 1 2 3 USB Power"
- **LIKELY: Wireless Scene Switch / Button Controller (not relay switch)**

**User Confirmation:**
Ian found on AliExpress:
> "Tuya Smart WiFi/Zigbee Micro USB Adaptor Switch 5V Mini 1 2 USB Power Adaptor Smart Life Control"

**Status:** ✅ **IDENTIFIED - Battery Button/Scene Controller**  
**Target Driver:** `wireless_switch_2gang_cr2032` (or create new if needed)  
**Action:** Add to wireless button driver, NOT AC switch driver

**Important Note:** 
- DO NOT add to `switch_2gang_ac` (AC powered switches)
- ADD to `wireless_switch_2gang_cr2032` (battery powered buttons)

---

## 📊 SUMMARY

| Device | Manufacturer ID | Model ID | Status | Action |
|--------|----------------|----------|--------|--------|
| Smart Plug | `_TZ3000_00mk2xzy` | TS011F | ✅ New | Add to `smart_plug_ac` |
| 2-Gang Switch AC | `_TZ3000_h1ipgkwn` | TS0002 | ✅ Done | Already added |
| Motion + Illuminance | `HOBEIAN` | ZG-204ZV | ✅ Done | Already present |
| Unknown TS0601 | `_TZE284_1lvln0x6` | TS0601 | ⏳ Pending | Ask user |
| Wireless 2-Gang Button | `_TZ3000_zmlunnhy` | TS0012 | ✅ New | Add to wireless driver |

---

## 🎯 ACTION ITEMS

### High Priority
1. ✅ Add `_TZ3000_00mk2xzy` to `smart_plug_ac` driver
2. ✅ Add `_TZ3000_zmlunnhy` to `wireless_switch_2gang_cr2032` driver
3. 📧 Email Ian Gibbo asking about `_TZE284_1lvln0x6` device type

### Medium Priority
4. 📧 Thank Ian for the interview data
5. 📧 Explain TS0012 battery = wireless button (not AC switch)
6. 📧 Request product link or photo for unknown TS0601 device

### Low Priority
7. 📝 Document unusual TS0012 battery variant
8. 🔍 Research `_TZE284_1lvln0x6` on Zigbee2MQTT database

---

## 📧 EMAIL RESPONSE TEMPLATE

**Subject:** Re: Interview data - Analysis complete + Question

**Body:**
```
Hi Ian,

Thank you for the detailed interview data! I've analyzed all 5 devices:

✅ ALREADY WORKING:
- TS0002 (_TZ3000_h1ipgkwn) - Already added to v3.0.43
- HOBEIAN motion sensor (ZG-204ZV) - Already supported

✅ NEW IDS TO ADD:
- TS011F (_TZ3000_00mk2xzy) - Smart plug with energy monitoring
- TS0012 (_TZ3000_zmlunnhy) - Battery powered wireless button (NOT AC switch!)

⚠️ IMPORTANT NOTE:
The TS0012 device you have is battery powered, which is unusual. 
Most TS0012 are AC powered switches, but yours is a wireless scene controller/button.
I'll add it to the wireless button driver, not the AC switch driver.

❓ QUESTION:
The TS0601 device (_TZE284_1lvln0x6) - I need to know:
1. What type of device is this physically?
2. What does it do? (sensor? button? controller?)
3. Can you provide a product link or photo?

TS0601 is a generic Tuya model that could be anything (temperature sensor, 
leak sensor, button, valve, etc.) so I need more info to add it correctly.

All the best,
Dylan
```

---

## 🔧 TECHNICAL NOTES

### Why TS0012 Battery is Unusual
- **Normal TS0012:** AC powered relay switch, `deviceType: "router"`
- **This TS0012:** Battery powered button, `deviceType: "enddevice"`
- **Key Differences:**
  - receiveWhenIdle: false (battery saves power)
  - No metering/electrical clusters
  - Scene switch functionality instead of relay control

### TS0601 Tuya Cluster
- Cluster 61184 (0xEF00) = Tuya proprietary cluster
- Requires specific datapoint parsing
- Different datapoints = different device types
- Cannot identify without knowing actual device function

---

**Generated:** October 17, 2025  
**Analyst:** Dylan Rajasekaram  
**Status:** 2 new IDs to add, 1 pending clarification
