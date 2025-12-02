# 📚 Zigbee Data Sources Reference

> Last updated: 2025-12-02

## 🔝 1. Universal Reference Sources (All Manufacturers)

| Source | URL | Data Available | Update Frequency |
|--------|-----|----------------|------------------|
| **Zigbee-OTA Official** | https://github.com/Koenkk/zigbee-OTA/blob/master/index.json | manufacturerCode, imageType, fileVersion, OTA URLs | Daily |
| **Zigbee-OTA Downgrade** | https://github.com/Koenkk/zigbee-OTA/blob/master/index1.json | Previous versions for rollback | Daily |
| **Z2M Converters DB** | https://github.com/Koenkk/zigbee-herdsman-converters/tree/master/src/devices | 3000+ definitions: zigbeeModel, vendor, exposes[], meta{} | Daily |
| **Z2M modernExtend** | https://github.com/Koenkk/zigbee-herdsman-converters/tree/master/src/lib/modernExtend | Ready functions: onOff(), light(), windowCovering(), battery() | Daily |
| **ZHA Quirks** | https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks | Custom clusters, manufacturer patches | Daily |
| **Blakadder Database** | https://zigbee.blakadder.com | Device specs + links to Z2M, ZHA, deCONZ | Weekly |
| **deCONZ DDF** | https://github.com/dresden-elektronik/deconz-rest-plugin/tree/master/devices | XML definitions (clusters, roles) | Daily |
| **Tuya Developer DP Ref** | https://developer.tuya.com/en/docs/iot/title?id=K9nmje3twsy7n | Official DP tables by category | Monthly |
| **Tuya IoT Cloud** | https://iot.tuya.com | Exact DPs for any Tuya product (add PID) | Real-time |
| **FairCasOTime OTA** | https://github.com/fairecasoimeme/otatool | OTA for Lixada, Sonoff, Nodon | Monthly |

---

## 🔗 Quick Links

```
# OTA Official Index
https://raw.githubusercontent.com/Koenkk/zigbee-OTA/master/index.json

# All Z2M Converters
https://github.com/Koenkk/zigbee-herdsman-converters/tree/master/src/devices

# All modernExtend Functions
https://github.com/Koenkk/zigbee-herdsman-converters/tree/master/src/lib/modernExtend

# Blakadder Search
https://zigbee.blakadder.com/search.html

# Official Tuya DPs
https://developer.tuya.com/en/docs/iot/title?id=K9nmje3twsy7n

# FairCasOTime OTA Tool
https://github.com/fairecasoimeme/otatool
```

---

## 🕵️ 2. Research Methods for Unknown Devices

### 2.1 Zigbee Sniffer
- **Hardware**: CC2652 USB stick + ZBOSS or Nordic sniffer
- **Capture**: Raw 0xEF00 frames
- **Decode**: Tuya DP Parser (SDK) or `zbee_tuya` Wireshark plugin

### 2.2 Zigbee2MQTT External Converter
```javascript
// data/external_converters/my_device.js
const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');

module.exports = {
  zigbeeModel: ['TS0601'],
  model: 'MY_DEVICE',
  vendor: 'Tuya',
  fromZigbee: [fz.tuya_data_point_dump],
  toZigbee: [],
  exposes: [exposes.presets.enum('state', ['on','off'])],
};
```

### 2.3 Homey Developer Tools
- Use Zigbee Mesh viewer
- Paste node descriptor + simple descriptor
- Identify missing clusters
- Inject clusters via Developer app during inclusion

### 2.4 Tuya Cloud Device Debugging
1. Add product to Tuya IoT Cloud (even OEM)
2. Go to "Logs" tab
3. See **DP_ID, type, value** in real-time
4. Copy mapping directly

### 2.5 Local OTA Forcing
```json
// my_index.json
[{
  "manufacturerCode": 4417,
  "imageType": 1234,
  "fileVersion": 100,
  "url": "file:///path/to/firmware.ota"
}]
```

### 2.6 Fingerprint Search
```
Google: "0xEF00" "manufacturerName" "modelID" site:github.com
Google: "TS0601" cover "DP 2" filetype:js
```

---

## 🧰 3. Cluster Reference

| Cluster (hex) | Name | Common DPs | Notes |
|---------------|------|------------|-------|
| 0x0000 | Basic | - | HW/SW version, read-only |
| 0x0001 | PowerCfg | 10, 11, 100 | Battery voltage/percentage |
| 0x0003 | Identify | - | Device identification |
| 0x0006 | OnOff | 1, 13 | On/off control |
| 0x0008 | LevelCtrl | 3 | Dimming, position |
| 0x0101 | DoorLock | 6-55 | Lock control |
| 0x0102 | WindowCovering | 2, 3, 5 | Curtain/blind |
| 0x0201 | Thermostat | 4, 101 | Temperature setpoint |
| 0x0202 | FanCtrl | 109, 110 | Fan speed/mode |
| 0x0300 | ColorCtrl | 111, 112, 113 | Hue/sat/temp |
| 0x0400 | Illuminance | 119 | Light sensor |
| 0x0402 | Temperature | 101 | Temp sensor |
| 0x0405 | Humidity | 102 | Humidity sensor |
| 0x0500 | IASZone | 1, 8, 26, 29 | Security sensors |
| 0x0501 | IASACE | 26, 27, 28 | Arm/disarm |
| 0x0502 | IASWD | 14 | Siren/strobe |
| 0x0702 | Metering | 254 | Energy metering |
| 0x0B04 | ElecMeas | 121 | Electrical measurement |
| **0xEF00** | **TuyaPrivate** | **ALL** | Manufacturer-specific |

---

## 📊 4. Data Point Quick Reference

### Standard DPs (1-50)
| DP | Usage | Capability |
|----|-------|------------|
| 1 | ON/OFF, alarms | onoff, alarm_* |
| 2 | Curtain state | windowcoverings_state |
| 3 | Position % | windowcoverings_set |
| 4 | Temp setpoint | target_temperature |
| 5 | Motor blocked | alarm_motor |
| 10 | Battery % | measure_battery |
| 13 | Child lock | child_lock |

### Sensor DPs (100-120)
| DP | Usage | Capability |
|----|-------|------------|
| 101 | Temperature | measure_temperature |
| 102 | Humidity | measure_humidity |
| 103 | Pressure | measure_pressure |
| 114 | CO2 | measure_co2 |
| 115 | PM2.5 | measure_pm25 |
| 117 | VOC | measure_voc |
| 119 | Illuminance | measure_luminance |

### Hidden DPs (240-255)
| DP | Usage | Brands |
|----|-------|--------|
| 240 | Presence event | Aqara FP2, Tuya |
| 241 | Zone ID | Aqara FP2 |
| 242 | Distance cm | Aqara FP2 |
| 244 | Zone bitmap | Aqara FP2 |
| 247 | Supply voltage | Tuya |
| 250 | Xmas pattern | Lidl |
| 252 | Valve protect | Moes |

---

## ✅ 5. Automation Workflow

| Step | Tool | Result |
|------|------|--------|
| 1. Scan unknown fingerprint | CC2652 stick | Clusters + endpoints |
| 2. Map 0xEF00 DPs | Tuya Cloud logs | Exact DP IDs |
| 3. Create temp converter | Z2M external_converters | Immediate testing |
| 4. Submit PR to Z2M | GitHub | Becomes official |
| 5. Add local OTA | my_index.json | Firmware available |

---

## 📁 Related Files

- `data/tuya-dp-complete-database.json` - Full DP database
- `data/tuya-dp-complete.csv` - CSV version
- `data/zigbee-brands-database.json` - Brands database
- `ZIGBEE-BRANDS.md` - Brands documentation

---

## 🔄 GitHub Actions Integration

All data fetching runs via:
- `.github/workflows/MASTER-intelligent-enrichment.yml`
- Schedule: **Mondays at 3:00 AM UTC**
- Manual trigger: `workflow_dispatch`

**NO runtime HTTP requests from the app itself!**
