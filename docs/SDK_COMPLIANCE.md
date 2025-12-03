# SDK Compliance Analysis

Based on official Homey Apps SDK Documentation (December 2024)

## 📚 Official SDK Resources

| Resource | URL |
|----------|-----|
| Apps SDK Guide | https://apps.developer.homey.app |
| SDK v3 Reference | https://apps-sdk-v3.developer.homey.app |
| Zigbee Dev Tools | https://developer.athom.com/tools/zigbee |
| Device Capabilities | https://apps.developer.homey.app/the-basics/devices/capabilities |
| Best Practices | https://apps.developer.homey.app/the-basics/devices/best-practices |

---

## ✅ Already Compliant

### 1. Driver Structure
- All 80 drivers have both `driver.js` and `device.js`
- All `driver.js` files extend `ZigBeeDriver`
- Device files extend `BaseHybridDevice` which extends `ZigBeeDevice`

### 2. IAS Zone Enrollment (Section 8.2.2.2.3)
```javascript
// ✅ Implemented in lib/managers/IASZoneManager.js
iasZone.onZoneEnrollRequest = () => {
  iasZone.zoneEnrollResponse({
    enrollResponseCode: 0, // Success
    zoneId: 10
  });
};
```

### 3. First Initialization Check
```javascript
// ✅ Used in BaseHybridDevice._runBackgroundInitialization()
if (this.isFirstInit()) {
  // Heavy operations only on first pairing
}
```

### 4. Promise Catching
```javascript
// ✅ Pattern used throughout
await someOperation().catch(err => this.error(err));
```

### 5. Non-Blocking Initialization
```javascript
// ✅ Background initialization pattern in BaseHybridDevice
Promise.resolve(this._runBackgroundInitialization()).catch(err => {
  this.error('Background initialization failed:', err.message);
});
```

## 📋 SDK Best Practices Checklist

| Practice | Status | Location |
|----------|--------|----------|
| Driver extends ZigBeeDriver | ✅ | All driver.js files |
| Device extends ZigBeeDevice | ✅ | Via BaseHybridDevice |
| Catch promises in onNodeInit | ✅ | BaseHybridDevice |
| Use isFirstInit() | ✅ | _runBackgroundInitialization |
| IAS Zone Enrollment | ✅ | IASZoneManager |
| Attribute Reporting Config | ✅ | BaseHybridDevice |
| Debug logging option | ✅ | zigbee-clusters debug() |
| Sub devices support | ✅ | Multi-endpoint support |

## 🔧 Manifest Structure (driver.compose.json)

Required fields per SDK:
```json
{
  "zigbee": {
    "manufacturerName": "...",
    "productId": ["..."],
    "endpoints": {
      "1": {
        "clusters": [0, 4, 5, 6],
        "bindings": [6]
      }
    },
    "learnmode": {
      "image": "/drivers/xxx/assets/learnmode.svg",
      "instruction": { "en": "..." }
    }
  }
}
```

## 📚 Cluster IDs Reference

| Cluster | ID (decimal) | ID (hex) | Usage |
|---------|--------------|----------|-------|
| Basic | 0 | 0x0000 | Device info |
| Power Config | 1 | 0x0001 | Battery |
| On/Off | 6 | 0x0006 | Switch |
| Level Control | 8 | 0x0008 | Dimming |
| Color Control | 768 | 0x0300 | RGB/CT |
| Temperature | 1026 | 0x0402 | Temp sensor |
| Humidity | 1029 | 0x0405 | Humidity |
| IAS Zone | 1280 | 0x0500 | Security |
| IAS ACE | 1281 | 0x0501 | Alarm Control |
| IAS WD | 1282 | 0x0502 | Warning Device |
| Tuya Private | 61184 | 0xEF00 | Tuya DP |

## 🔒 IAS Zone Implementation

Per SDK documentation:
1. Add cluster id 1280 to "clusters" array
2. Use zigbee-clusters@1.7.0 or higher
3. Listen for Zone Enroll Request
4. Reply with Zone Enroll Response

```javascript
// In device.js onNodeInit
zclNode.endpoints[1].clusters.iasZone.onZoneEnrollRequest = () => {
  zclNode.endpoints[1].clusters.iasZone.zoneEnrollResponse({
    enrollResponseCode: 0, // Success
    zoneId: 10
  });
};
```

## 📊 Attribute Reporting

```javascript
// Configure attribute reporting
await this.configureAttributeReporting([{
  endpointId: 1,
  cluster: CLUSTER.ON_OFF,
  attributeName: 'onOff',
  minInterval: 0,
  maxInterval: 300,
  minChange: 1
}]).catch(err => this.error(err));
```

## 🎯 Sub Devices (Multi-Gang)

```json
// In driver.compose.json
{
  "zigbee": {
    "devices": {
      "secondOutlet": {
        "class": "socket",
        "capabilities": ["onoff"],
        "name": { "en": "Second Outlet" },
        "settings": []
      }
    }
  }
}
```

```javascript
// In driver.js
class Driver extends ZigBeeDriver {
  onMapDeviceClass(device) {
    if (device.getData().subDeviceId === 'secondOutlet') {
      return SecondOutletDevice;
    }
    return RootDevice;
  }
}
```

---

## 🔧 Zigbee Developer Tools

Access: https://developer.athom.com/tools/zigbee

### Nodes Table Properties

| Property | Description | Usage |
|----------|-------------|-------|
| **Node ID** | Random identifier | Table reference |
| **IEEE Address** | Unique device ID | Device identification |
| **Network Address** | Current network address | Routing |
| **Type** | Router or EndDevice | Router = mains, EndDevice = battery |
| **Online** | Responds to ping | Refresh to update |
| **Receive When Idle** | Can receive anytime | Only routers = true |
| **Manufacturer** | `manufacturerName` | **Use in driver manifest!** |
| **Model ID** | `productId` | **Use in driver manifest!** |
| **Route** | Last known route | Network path |

### Interview Process

The **Interview** button retrieves:
- `modelId` and `manufacturerName` for driver manifest
- `endpointDescriptors` - all endpoints and their clusters
- `endpoints` - detailed cluster info (commands, attributes, reporting config)

> ⚠️ EndDevices (battery) are slower to interview - they sleep most of the time.

### Device Types

| Type | Power | Routing | Receive When Idle |
|------|-------|---------|-------------------|
| **Router** | Mains | Yes (repeater) | Yes |
| **EndDevice** | Battery | No | No (sleepy) |

### System Information

| Property | Description |
|----------|-------------|
| Channel | Current Zigbee channel (11-26) |
| Pan ID | Personal Area Network ID |
| Extended PAN ID | Extended PAN ID |
| IEEE Address | Homey's unique Zigbee ID |
| Network Key | Encryption key for Zigbee traffic |
| Network Address | Always 0 (Homey is coordinator) |

### Getting Device Fingerprints

1. Pair device as "Basic Zigbee Device"
2. Go to Zigbee Developer Tools
3. Find device in Nodes Table
4. Note **Manufacturer** → `manufacturerName`
5. Note **Model ID** → `productId`
6. Click **Interview** for cluster details

### Example Fingerprint Discovery

```
Nodes Table:
  Manufacturer: _TZE284_vvmbj46n
  Model ID: TS0601
  Type: EndDevice

Interview Result:
  endpointDescriptors:
    endpoint 1:
      clusters: [0, 1, 61184]  // Basic, PowerConfig, Tuya
```

→ Driver manifest:
```json
{
  "zigbee": {
    "manufacturerName": "_TZE284_vvmbj46n",
    "productId": ["TS0601"],
    "endpoints": {
      "1": {
        "clusters": [0, 1, 61184]
      }
    }
  }
}
```

---

## 🔋 Battery Best Practices (SDK Official)

### Rule: Never use BOTH `measure_battery` AND `alarm_battery`

> "Never give your driver both the `measure_battery` and the `alarm_battery` capabilities. This creates duplicate UI components and Flow cards."

**Correct:**
```json
{
  "capabilities": ["measure_battery", "measure_temperature"]
}
```

**Incorrect:**
```json
{
  "capabilities": ["measure_battery", "alarm_battery", "measure_temperature"]
}
```

### Battery Type Specification

All battery devices MUST specify the `energy.batteries` array:

```json
{
  "energy": {
    "batteries": ["AAA", "AAA"]
  }
}
```

**Valid Battery Types:**
- `LS14250`, `C`, `AA`, `AAA`, `AAAA`
- `A23`, `A27`, `PP3`
- `CR123A`, `CR2`, `CR1632`, `CR2032`, `CR2430`, `CR2450`, `CR2477`, `CR3032`, `CR14250`
- `INTERNAL`, `OTHER`

---

## 💡 Light Best Practices (SDK Official)

### Device Class Selection

| Use Case | Device Class |
|----------|--------------|
| Light bulbs, LED strips | `light` |
| Smart plugs, wall outlets | `socket` |
| Multi-purpose modules | `socket` (user can change) |

### Capability Coupling (onoff + dim)

Use `registerMultipleCapabilityListener` to debounce onoff+dim:

```javascript
this.registerMultipleCapabilityListener(['onoff', 'dim'], async ({ onoff, dim }) => {
  if (dim > 0 && onoff === false) {
    await device.turnOff();
  } else if (dim <= 0 && onoff === true) {
    await device.turnOn();
  } else {
    await device.setOnOffAndDim({ onoff, dim });
  }
}, 500); // 500ms debounce
```

### setOnDim Capability Option

```json
{
  "capabilitiesOptions": {
    "onoff": {
      "setOnDim": true
    }
  }
}
```

---

## 📊 Capability Options Reference

### All Capabilities
| Option | Description |
|--------|-------------|
| `title` | Custom title (2-3 words max) |
| `preventInsights` | Disable Insights generation |
| `preventTag` | Disable Flow Tag generation |

### Boolean Capabilities (`onoff`, `alarm_*`)
| Option | Description |
|--------|-------------|
| `insightsTitleTrue` | Timeline title when true |
| `insightsTitleFalse` | Timeline title when false |
| `titleTrue` | Sensor UI title when true |
| `titleFalse` | Sensor UI title when false |

### Number Capabilities (`measure_*`)
| Option | Description |
|--------|-------------|
| `units` | Unit string (e.g., "°C") |
| `decimals` | Decimal places in UI |
| `min` | Minimum value |
| `max` | Maximum value |
| `step` | Step size |

### Zone Activity (Alarms)
| Option | Description |
|--------|-------------|
| `zoneActivity` | `true`/`false` - trigger zone activity |

---

## 🎨 UI Components Reference

| Component | Type | Capabilities |
|-----------|------|--------------|
| `toggle` | boolean | `onoff` |
| `slider` | number | `dim`, `volume_set` |
| `sensor` | any | `measure_*`, `alarm_*` |
| `thermostat` | number | `target_temperature` + `measure_temperature` |
| `color` | number | `light_hue`, `light_saturation`, `light_temperature` |
| `battery` | number | `measure_battery` OR `alarm_battery` |
| `picker` | enum | `thermostat_mode` |
| `button` | boolean | `button`, `volume_up` |
| `null` | hidden | Any capability to hide |

---

## 🔧 Device API Methods

### Capability Management
```javascript
// Set capability value
await this.setCapabilityValue('measure_temperature', 22.5);

// Listen for capability changes from user/Flow
this.registerCapabilityListener('onoff', async (value, opts) => {
  // Send command to device
});

// Multiple capabilities (debounced)
this.registerMultipleCapabilityListener(['dim', 'light_hue'], async (values, opts) => {
  // Combined handling
}, 500);

// Add/remove capabilities dynamically
await this.addCapability('measure_humidity');
await this.removeCapability('alarm_battery');
```

### Device Status
```javascript
// Availability
await this.setAvailable();
await this.setUnavailable('Device offline');

// Warning (persistent until unset)
await this.setWarning('Low battery');
await this.unsetWarning();

// Last seen (Homey v12.6.1+)
this.setLastSeenAt();
```

### Storage
```javascript
// Settings (user-visible)
const value = this.getSetting('poll_interval');
await this.setSettings({ poll_interval: 60 });

// Store (internal, hidden)
const cached = this.getStoreValue('last_state');
await this.setStoreValue('last_state', state);
await this.unsetStoreValue('old_key');
```

---

*Generated from Homey Apps SDK Documentation analysis*
*App Version: 5.3.46*
