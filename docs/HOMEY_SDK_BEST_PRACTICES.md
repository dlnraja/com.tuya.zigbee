# Homey SDK Best Practices

> Extracted from official Homey Developer Documentation (2026-01-24)
> Sources: https://apps.developer.homey.app/wireless/zigbee, https://apps.developer.homey.app/wireless/matter

---

## 1. Zigbee Best Practices

### 1.1 Device Initialization

**CRITICAL: Avoid communication in `onInit` or `onNodeInit`**

```javascript
// ❌ DON'T - Zigbee may not be ready
async onNodeInit({ zclNode }) {
  const value = await zclNode.endpoints[1].clusters.onOff.readAttributes(['onOff']);
}

// ✅ DO - Always catch promises
async onNodeInit({ zclNode }) {
  const value = await zclNode.endpoints[1].clusters.onOff.readAttributes(['onOff'])
    .catch(err => { this.error(err); });
}
```

**First-time initialization only:**
```javascript
if (this.isFirstInit() === true) {
  // Only runs on first pairing, not on app restart
}
```

### 1.2 Attribute Reporting

**Configure for sleepy end devices** - ensures device periodically sends messages to Homey:

```javascript
this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
  reportOpts: {
    configureAttributeReporting: {
      minInterval: 0,      // No minimum
      maxInterval: 60000,  // Every ~16 hours max
      minChange: 5,        // Report when changed by 5
    },
  },
});
```

### 1.3 IAS Zone Enrollment (Cluster 1280)

**Critical for contact sensors, motion sensors, smoke detectors:**

1. Add cluster `1280` to `clusters` array in driver.compose.json
2. Listen for Zone Enroll Request
3. Reply with Zone Enroll Response

```javascript
// IAS Zone enrollment handler
zclNode.endpoints[1].clusters.iasZone.onZoneEnrollRequest = async () => {
  return { enrollResponseCode: 0, zoneId: 0 }; // Success
};

// Proactive enrollment (device may have sent request before driver initialized)
await zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
  enrollResponseCode: 0,
  zoneId: 0,
}).catch(() => {});
```

### 1.4 Sub Devices (Multi-gang switches)

For devices with multiple outputs (e.g., 2-gang switch):

```json
{
  "zigbee": {
    "devices": {
      "secondSwitch": {
        "class": "socket",
        "capabilities": ["onoff"],
        "settings": []
      }
    }
  }
}
```

Access in device.js:
```javascript
const subDeviceId = this.getData().subDeviceId;
if (subDeviceId === 'secondSwitch') {
  // Handle second switch
}
```

### 1.5 Bindings and Groups

- **clusters**: Cluster IDs to send commands TO (client)
- **bindings**: Cluster IDs to RECEIVE commands FROM (server)

```json
{
  "endpoints": {
    "1": {
      "clusters": [0, 4, 5, 6],
      "bindings": [6]
    }
  }
}
```

### 1.6 Debugging

```javascript
const { debug } = require('zigbee-clusters');
debug(true); // Enable all Zigbee logging
// ⚠️ Disable before publishing!
```

---

## 2. Matter Support

### 2.1 Overview

- Protocol built on Wi-Fi, Ethernet, Thread
- **Only available on Homey Pro (Early 2023)**
- No custom Device class needed - Homey handles capabilities automatically

### 2.2 Driver Manifest

```json
{
  "platforms": ["local"],
  "connectivity": ["matter"],
  "class": "socket",
  "capabilities": ["onoff", "dim"],
  "matter": {
    "vendorId": 1234,
    "productId": 4567,
    "learnmode": {
      "instruction": { "en": "Press button 3 times" }
    }
  }
}
```

### 2.3 Bridged Devices

For Matter bridges (e.g., Zigbee hub exposing devices via Matter):

**Bridge driver:**
```json
{
  "class": "other",
  "capabilities": [],
  "matter": { "vendorId": 1234, "productId": 4567 }
}
```

**Bridged device driver:**
```json
{
  "matter": {
    "vendorId": 1234,
    "productId": 4567,
    "deviceVendorId": 1234,
    "deviceProductName": "XYZ-123"
  }
}
```

---

## 3. Key Cluster IDs Reference

| Cluster | ID | Description |
|---------|-----|-------------|
| Basic | 0 | Device info |
| Power Config | 1 | Battery |
| Identify | 3 | Identify |
| Groups | 4 | Group membership |
| Scenes | 5 | Scene control |
| OnOff | 6 | On/Off |
| Level Control | 8 | Dimming |
| Color Control | 768 | Color/temperature |
| Illuminance | 1024 | Light sensor |
| Temperature | 1026 | Temp sensor |
| Humidity | 1029 | Humidity sensor |
| IAS Zone | 1280 | Intruder alarm |
| Electrical | 2820 | Power measurement |
| Tuya | 61184 | Tuya proprietary |

---

## 4. Improvements Applied to This Project

Based on official documentation, the following improvements have been verified/applied:

### ✅ Already Implemented
- [x] IAS Zone enrollment in `HybridSensorBase.js` (v5.5.601)
- [x] Promise catching in all `onNodeInit` calls
- [x] Attribute reporting configuration for sleepy devices
- [x] Sub-device support for multi-gang switches
- [x] Tuya cluster (61184) custom implementation

### 🔄 Recommendations for Future
- [ ] Add Matter bridge support for Tuya Matter devices
- [ ] Implement `platformLocalRequiredFeatures` check
- [ ] Add debug toggle setting for troubleshooting
- [ ] Document all cluster bindings in driver manifests

---

*Generated: 2026-01-24*
