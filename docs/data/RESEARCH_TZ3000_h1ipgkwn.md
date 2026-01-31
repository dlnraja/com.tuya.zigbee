# Research: _TZ3000_h1ipgkwn (TS0002 USB Dongle)

## 📊 Device Summary

| Property | Value |
|----------|-------|
| **manufacturerName** | `_TZ3000_h1ipgkwn` |
| **modelId** | `TS0002` |
| **Type** | Dual USB Switch/Dongle (NOT wall switch!) |
| **Power Source** | Mains (USB powered) |
| **Router** | Yes (acts as Zigbee repeater) |
| **Endpoints** | EP1, EP2, EP242 |

## 🔗 Sources Researched

### 1. Z2M GitHub Issue #23625
- **URL:** https://github.com/Koenkk/zigbee2mqtt/issues/23625
- **Title:** [New device support]: Dual USB switch - _TZ3000_h1ipgkwn
- **Reporter:** ViscountHermit (Aug 15, 2024)
- **Product Link:** https://a.aliexpress.com/_EGJ9RZB
- **Status:** Closed (supported in Z2M)

### 2. Z2M Device Page
- **URL:** https://www.zigbee2mqtt.io/devices/TZ3000_h1ipgkwn.html
- **Exposes:**
  - Switch L1 (endpoint 1)
  - Switch L2 (endpoint 2)
  - Power-on behavior L1
  - Power-on behavior L2

### 3. Sprut Hub Issue #3517
- **URL:** https://github.com/sprut/Hub/issues/3517
- **Confirms:** TS0002 with custom clusters E000, D001

## 📋 Cluster Analysis (from Z2M database)

### Endpoint 1:
```json
{
  "inClusterList": [3, 4, 5, 6, 1794, 2820, 57344, 57345, 0],
  "outClusterList": [25, 10]
}
```

| Cluster | Name | Purpose |
|---------|------|---------|
| 0 | genBasic | Device info |
| 3 | genIdentify | Identify |
| 4 | genGroups | Groups |
| 5 | genScenes | Scenes |
| 6 | genOnOff | Switch control |
| 1794 | seMetering | Energy metering |
| 2820 | haElectricalMeasurement | Electrical measurement |
| 57344 (0xE000) | manuSpecificTuya | Tuya custom |
| 57345 (0xE001) | manuSpecificTuya_3 | Tuya custom |

### Endpoint 2:
```json
{
  "inClusterList": [4, 5, 6],
  "outClusterList": []
}
```

## ⚙️ Driver Configuration

### Correct Driver: `usb_dongle_dual_repeater`

**Capabilities:**
- `onoff` - USB Port 1
- `onoff.usb2` - USB Port 2
- `measure_power` - Power consumption
- `meter_power` - Energy usage
- `measure_voltage` - Voltage
- `measure_current` - Current

### Fingerprints (all case variants):
- `_TZ3000_h1ipgkwn` ✅ (exact from device)
- `_TZ3000_H1IPGKWN` (uppercase)
- `_tz3000_h1ipgkwn` (lowercase)

### ProductId:
- `TS0002` ✅

## ❌ Wrong Classification History

This device was incorrectly classified as a **2-gang wall switch** because:
1. Same `TS0002` productId as wall switches
2. Same `_TZ3000_*` manufacturer prefix

**Fix applied in v5.6.1:**
- Removed from `switch_2gang` driver
- Added to `usb_dongle_dual_repeater` driver
- Added `TS0002` to productId list

## 🔌 Hardware Description

From AliExpress listing and user reports:
- **Form Factor:** USB dongle/hub
- **Ports:** 2x USB-A output ports
- **Features:**
  - Individual port control
  - Blue LED indicator
  - Button to toggle USB ports
  - Acts as Zigbee router/repeater
  - Energy monitoring (some variants)

## 📝 Z2M External Converter

```javascript
const {deviceEndpoints, identify, onOff, electricityMeter} = require('zigbee-herdsman-converters/lib/modernExtend');

const definition = {
  zigbeeModel: ['TS0002'],
  model: 'TS0002',
  vendor: '_TZ3000_h1ipgkwn',
  description: 'Dual USB switch dongle',
  extend: [
    deviceEndpoints({"endpoints":{"1":1,"2":2}}),
    identify(),
    onOff({"powerOnBehavior":false,"endpointNames":["1","2"]}),
    electricityMeter()
  ],
  meta: {"multiEndpoint":true}
};

module.exports = definition;
```

## ✅ Action Taken

1. **v5.6.1:** Moved fingerprint from `switch_2gang` to `usb_dongle_dual_repeater`
2. **v5.6.2:** Added exact mixed-case fingerprint `_TZ3000_h1ipgkwn`

---

*Research completed: 2026-01-31*
*Sources: Z2M, SLS, Sprut Hub, Jeedom, AliExpress*
