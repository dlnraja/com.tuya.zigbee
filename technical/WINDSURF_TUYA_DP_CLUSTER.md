# 🔧 WINDSURF AI - TUYA DATA POINTS (DP) & CUSTOM CLUSTER

**⚠️ CRITICAL TECHNICAL ADDENDUM - READ AFTER MAIN PROMPTS**

## 🎯 ROOT CAUSE IDENTIFIED (Gemini Analysis)

### Problem Statement
> **"Tuya's custom capabilities do not respect the standard Zigbee values. I must find and understand each custom value to see the battery level, temperatures, and other KPIs. There are more than 80 new capabilities to discover."**

### Technical Root Cause
Tuya devices use **proprietary Data Points (DPs)** instead of standard Zigbee clusters:

| Standard Zigbee | Tuya Proprietary |
|----------------|------------------|
| Cluster 0x0001 (genPowerCfg) → batteryPercentageRemaining | Cluster 0xEF00 → DP 4 → Battery % |
| Cluster 0x0402 (msTemperatureMeasurement) → measuredValue | Cluster 0xEF00 → DP 18 → Temp (×10) |
| Cluster 0x0500 (IAS Zone) → zoneStatus | Cluster 0xEF00 → DP 1 → Motion (0/1) |

**Result**: Homey expects standard clusters, but Tuya sends DP-encoded messages in cluster 0xEF00.

---

## 📚 OFFICIAL REFERENCE

**node-zigbee-clusters Custom Cluster Guide**:
https://github.com/athombv/node-zigbee-clusters#implementing-a-custom-cluster

This is the **official Athom/Homey method** for implementing manufacturer-specific clusters.

---

## 🏗️ SOLUTION ARCHITECTURE

### Phase 1: Create Tuya Manufacturer Cluster
**File**: `lib/TuyaManufacturerCluster.js`

```javascript
'use strict';

const { Cluster, ZCLDataTypes } = require('zigbee-clusters');

/**
 * TUYA MANUFACTURER CLUSTER (0xEF00)
 * 
 * Tuya uses a proprietary cluster to send Data Points (DPs).
 * Each DP has:
 * - DP ID (number): identifies the data type (1=motion, 4=battery, 18=temp, etc.)
 * - DP Type (enum): Bool, Value, Enum, String, Raw, Bitmap
 * - DP Value (varies): the actual data
 * 
 * Reference: 
 * - https://github.com/Koenkk/zigbee2mqtt/blob/master/lib/tuya.ts
 * - https://github.com/zigpy/zha-device-handlers
 */

const TUYA_DATA_TYPES = {
  DP_TYPE_RAW: 0x00,
  DP_TYPE_BOOL: 0x01,
  DP_TYPE_VALUE: 0x02,
  DP_TYPE_STRING: 0x03,
  DP_TYPE_ENUM: 0x04,
  DP_TYPE_BITMAP: 0x05
};

class TuyaManufacturerCluster extends Cluster {
  static get ID() {
    return 0xEF00; // Tuya's proprietary cluster ID
  }

  static get NAME() {
    return 'tuyaManufacturer';
  }

  static get MANUFACTURER_ID() {
    return 0x1002; // Tuya manufacturer ID (sometimes 0x1000, 0x104E)
  }

  static get ATTRIBUTES() {
    return {
      // Tuya typically uses attribute 0x0000 for all DP data
      dataPoints: {
        id: 0x0000,
        type: ZCLDataTypes.buffer, // Raw buffer that we'll parse
        manufacturerId: 0x1002
      }
    };
  }

  static get COMMANDS() {
    return {
      // Command to send DP to device (for control)
      dataRequest: {
        id: 0x00,
        args: {
          dpId: ZCLDataTypes.uint8,
          dpType: ZCLDataTypes.uint8,
          dpValue: ZCLDataTypes.buffer
        }
      },
      // Command to receive DP from device (reports)
      dataReport: {
        id: 0x01,
        args: {
          dpId: ZCLDataTypes.uint8,
          dpType: ZCLDataTypes.uint8,
          dpValue: ZCLDataTypes.buffer
        }
      }
    };
  }
}

module.exports = TuyaManufacturerCluster;
```

---

### Phase 2: Register Custom Cluster
**File**: `lib/registerClusters.js`

```javascript
'use strict';

const { Cluster } = require('zigbee-clusters');
const TuyaManufacturerCluster = require('./TuyaManufacturerCluster');

/**
 * Register all custom clusters with Homey
 * Call this ONCE at app startup
 */
function registerCustomClusters() {
  try {
    Cluster.addCluster(TuyaManufacturerCluster);
    console.log('✅ Tuya Manufacturer Cluster (0xEF00) registered');
  } catch (err) {
    // Ignore if already registered
    if (!err.message.includes('already exists')) {
      console.error('❌ Failed to register Tuya cluster:', err);
    }
  }
}

module.exports = { registerCustomClusters };
```

**Call in App.js**:
```javascript
// app.js
const { registerCustomClusters } = require('./lib/registerClusters');

class TuyaZigbeeApp extends Homey.App {
  async onInit() {
    this.log('Universal Tuya Zigbee App initializing...');
    
    // Register custom clusters FIRST
    registerCustomClusters();
    
    // ... rest of app initialization
  }
}
```

---

### Phase 3: Create Tuya DP Parser
**File**: `lib/TuyaDPParser.js`

```javascript
'use strict';

/**
 * TUYA DATA POINT (DP) PARSER
 * 
 * Parses the raw buffer from Tuya cluster 0xEF00 into structured DP data
 */

const TUYA_DP_TYPE = {
  RAW: 0x00,
  BOOL: 0x01,
  VALUE: 0x02,
  STRING: 0x03,
  ENUM: 0x04,
  BITMAP: 0x05
};

class TuyaDPParser {
  /**
   * Parse Tuya DP from raw ZCL data
   * @param {Buffer} buffer - Raw ZCL data buffer
   * @returns {Object} { dpId, dpType, dpValue }
   */
  static parse(buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length < 4) {
      throw new Error('Invalid Tuya DP buffer');
    }

    // Tuya DP format (simplified):
    // Byte 0: Status (usually 0x00)
    // Byte 1: Transaction sequence number
    // Byte 2: DP ID
    // Byte 3: DP Type
    // Byte 4-5: Data length (big-endian uint16)
    // Byte 6+: Data value

    let offset = 0;

    // Skip status byte
    offset += 1;

    // Skip sequence number
    offset += 1;

    // Read DP ID
    const dpId = buffer.readUInt8(offset);
    offset += 1;

    // Read DP Type
    const dpType = buffer.readUInt8(offset);
    offset += 1;

    // Read data length (big-endian)
    const dataLength = buffer.readUInt16BE(offset);
    offset += 2;

    // Extract data buffer
    const dataBuffer = buffer.slice(offset, offset + dataLength);

    // Parse value based on type
    const dpValue = this.parseValue(dpType, dataBuffer);

    return { dpId, dpType, dpValue };
  }

  /**
   * Parse DP value based on type
   */
  static parseValue(dpType, dataBuffer) {
    switch (dpType) {
      case TUYA_DP_TYPE.BOOL:
        return dataBuffer.readUInt8(0) === 1;

      case TUYA_DP_TYPE.VALUE:
        // 4-byte big-endian integer
        if (dataBuffer.length === 4) {
          return dataBuffer.readInt32BE(0);
        }
        // 2-byte big-endian integer (common for temp, battery)
        if (dataBuffer.length === 2) {
          return dataBuffer.readInt16BE(0);
        }
        // 1-byte integer
        return dataBuffer.readUInt8(0);

      case TUYA_DP_TYPE.ENUM:
        return dataBuffer.readUInt8(0);

      case TUYA_DP_TYPE.BITMAP:
        // Return as array of active bits
        const byte = dataBuffer.readUInt8(0);
        const activeBits = [];
        for (let i = 0; i < 8; i++) {
          if (byte & (1 << i)) {
            activeBits.push(i);
          }
        }
        return activeBits;

      case TUYA_DP_TYPE.STRING:
        return dataBuffer.toString('utf8');

      case TUYA_DP_TYPE.RAW:
      default:
        return dataBuffer;
    }
  }

  /**
   * Encode DP value for sending to device
   */
  static encode(dpId, dpType, value) {
    // Implementation for sending commands to device
    // (needed for switches, dimmers, etc.)
    const buffer = Buffer.alloc(100); // Adjust size as needed
    let offset = 0;

    // Status byte
    buffer.writeUInt8(0x00, offset);
    offset += 1;

    // Sequence (increment per command)
    buffer.writeUInt8(0x00, offset);
    offset += 1;

    // DP ID
    buffer.writeUInt8(dpId, offset);
    offset += 1;

    // DP Type
    buffer.writeUInt8(dpType, offset);
    offset += 1;

    // Encode value based on type
    let dataBuffer;
    switch (dpType) {
      case TUYA_DP_TYPE.BOOL:
        dataBuffer = Buffer.alloc(1);
        dataBuffer.writeUInt8(value ? 1 : 0, 0);
        break;

      case TUYA_DP_TYPE.VALUE:
        dataBuffer = Buffer.alloc(4);
        dataBuffer.writeInt32BE(value, 0);
        break;

      case TUYA_DP_TYPE.ENUM:
        dataBuffer = Buffer.alloc(1);
        dataBuffer.writeUInt8(value, 0);
        break;

      default:
        throw new Error(`Unsupported DP type for encoding: ${dpType}`);
    }

    // Write data length
    buffer.writeUInt16BE(dataBuffer.length, offset);
    offset += 2;

    // Write data
    dataBuffer.copy(buffer, offset);
    offset += dataBuffer.length;

    return buffer.slice(0, offset);
  }
}

module.exports = TuyaDPParser;
```

---

### Phase 4: Create DP Mapping Database
**File**: `lib/tuya-engine/dp-database.json`

```json
{
  "motion_sensor": {
    "description": "Motion/Occupancy sensors",
    "dpMap": {
      "1": {
        "name": "presence",
        "type": "BOOL",
        "capability": "alarm_motion",
        "readonly": true
      },
      "4": {
        "name": "battery",
        "type": "VALUE",
        "capability": "measure_battery",
        "readonly": true,
        "scale": 1
      },
      "9": {
        "name": "sensitivity",
        "type": "ENUM",
        "capability": "motion_sensitivity",
        "values": { "0": "low", "1": "medium", "2": "high" }
      },
      "10": {
        "name": "keep_time",
        "type": "VALUE",
        "capability": "motion_timeout",
        "unit": "seconds",
        "scale": 1
      }
    }
  },
  "temperature_humidity": {
    "description": "Temperature & Humidity sensors",
    "dpMap": {
      "1": {
        "name": "temperature",
        "type": "VALUE",
        "capability": "measure_temperature",
        "readonly": true,
        "scale": 0.1,
        "unit": "°C"
      },
      "2": {
        "name": "humidity",
        "type": "VALUE",
        "capability": "measure_humidity",
        "readonly": true,
        "scale": 1,
        "unit": "%"
      },
      "4": {
        "name": "battery",
        "type": "VALUE",
        "capability": "measure_battery",
        "readonly": true,
        "scale": 1
      },
      "9": {
        "name": "temp_alarm",
        "type": "BOOL",
        "capability": "alarm_heat",
        "readonly": true
      },
      "10": {
        "name": "humidity_alarm",
        "type": "BOOL",
        "capability": "alarm_humidity",
        "readonly": true
      }
    }
  },
  "smart_plug": {
    "description": "Smart plugs with energy monitoring",
    "dpMap": {
      "1": {
        "name": "switch",
        "type": "BOOL",
        "capability": "onoff",
        "readonly": false
      },
      "18": {
        "name": "current",
        "type": "VALUE",
        "capability": "measure_current",
        "readonly": true,
        "scale": 0.001,
        "unit": "A"
      },
      "19": {
        "name": "power",
        "type": "VALUE",
        "capability": "measure_power",
        "readonly": true,
        "scale": 0.1,
        "unit": "W"
      },
      "20": {
        "name": "voltage",
        "type": "VALUE",
        "capability": "measure_voltage",
        "readonly": true,
        "scale": 0.1,
        "unit": "V"
      }
    }
  },
  "dimmer": {
    "description": "Dimmers and brightness control",
    "dpMap": {
      "1": {
        "name": "switch",
        "type": "BOOL",
        "capability": "onoff",
        "readonly": false
      },
      "2": {
        "name": "brightness",
        "type": "VALUE",
        "capability": "dim",
        "readonly": false,
        "scale": 0.001,
        "min": 10,
        "max": 1000
      },
      "3": {
        "name": "min_brightness",
        "type": "VALUE",
        "capability": "dim.min",
        "readonly": false,
        "scale": 0.001
      }
    }
  },
  "cover": {
    "description": "Curtains, blinds, shutters",
    "dpMap": {
      "1": {
        "name": "control",
        "type": "ENUM",
        "capability": "windowcoverings_state",
        "values": { "0": "open", "1": "stop", "2": "close" }
      },
      "2": {
        "name": "position",
        "type": "VALUE",
        "capability": "windowcoverings_set",
        "readonly": false,
        "scale": 0.01,
        "min": 0,
        "max": 100
      },
      "3": {
        "name": "current_position",
        "type": "VALUE",
        "capability": "windowcoverings_set",
        "readonly": true,
        "scale": 0.01
      },
      "5": {
        "name": "mode",
        "type": "ENUM",
        "capability": "cover_mode",
        "values": { "0": "tilt", "1": "lift" }
      }
    }
  }
}
```

---

### Phase 5: Update Device Drivers to Use DP Parser
**Example**: `drivers/motion_temp_humidity_illumination_multi_battery/device.js`

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const TuyaDPParser = require('../../lib/TuyaDPParser');
const dpDatabase = require('../../lib/tuya-engine/dp-database.json');

class TuyaMultiSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Tuya Multi-Sensor initialized');

    // Get DP mapping for this device type
    this.dpMap = dpDatabase.temperature_humidity.dpMap;

    // Listen for Tuya cluster reports (0xEF00)
    const tuyaCluster = zclNode.endpoints[1]?.clusters?.tuyaManufacturer;
    
    if (tuyaCluster) {
      this.log('✅ Tuya manufacturer cluster found');
      
      // Listen for DP reports
      tuyaCluster.on('dataReport', (data) => {
        this.handleTuyaDP(data);
      });

      // Also listen on 'raw' for generic reports
      this.on('raw', (raw) => {
        if (raw.cluster?.id === 0xEF00) {
          try {
            const dp = TuyaDPParser.parse(raw.data);
            this.handleTuyaDP(dp);
          } catch (err) {
            this.error('DP parse error:', err);
          }
        }
      });

    } else {
      this.log('⚠️ No Tuya cluster, falling back to standard Zigbee');
      // Use standard cluster registration (existing code)
      await this.registerStandardCapabilities();
    }

    await this.setAvailable();
  }

  /**
   * Handle incoming Tuya Data Point
   */
  handleTuyaDP({ dpId, dpType, dpValue }) {
    this.log(`📊 DP Report: ID=${dpId}, Type=${dpType}, Value=${dpValue}`);

    // Look up DP in our mapping
    const dpConfig = this.dpMap[dpId];
    if (!dpConfig) {
      this.log(`⚠️ Unknown DP ID ${dpId}, value: ${dpValue}`);
      return;
    }

    const { capability, scale = 1, readonly } = dpConfig;

    if (!this.hasCapability(capability)) {
      this.log(`⚠️ Capability ${capability} not registered for DP ${dpId}`);
      return;
    }

    // Apply scaling
    let finalValue = dpValue;
    if (typeof dpValue === 'number' && scale !== 1) {
      finalValue = dpValue * scale;
    }

    // Update Homey capability
    this.setCapabilityValue(capability, finalValue)
      .then(() => {
        this.log(`✅ ${capability} = ${finalValue} (DP ${dpId})`);
      })
      .catch(err => {
        this.error(`Failed to set ${capability}:`, err);
      });
  }

  /**
   * Send DP command to device (for writable DPs)
   */
  async sendTuyaDP(dpId, value) {
    const dpConfig = this.dpMap[dpId];
    if (!dpConfig) {
      throw new Error(`Unknown DP ID: ${dpId}`);
    }

    const { scale = 1, type } = dpConfig;

    // Reverse scaling
    let scaledValue = value;
    if (typeof value === 'number' && scale !== 1) {
      scaledValue = Math.round(value / scale);
    }

    // Determine DP type code
    const DP_TYPE = {
      BOOL: 0x01,
      VALUE: 0x02,
      ENUM: 0x04
    };

    const dpTypeCode = DP_TYPE[type] || DP_TYPE.VALUE;

    // Encode and send
    const buffer = TuyaDPParser.encode(dpId, dpTypeCode, scaledValue);
    
    const tuyaCluster = this.zclNode.endpoints[1]?.clusters?.tuyaManufacturer;
    if (tuyaCluster) {
      await tuyaCluster.dataRequest(buffer);
      this.log(`✅ Sent DP ${dpId} = ${scaledValue}`);
    }
  }

  /**
   * Register capability listeners for writable DPs
   */
  async registerTuyaCapabilities() {
    // Example: onoff capability
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        await this.sendTuyaDP(1, value); // DP 1 = switch
      });
    }

    // Example: dim capability
    if (this.hasCapability('dim')) {
      this.registerCapabilityListener('dim', async (value) => {
        const brightness = Math.round(value * 1000); // Scale 0-1 to 0-1000
        await this.sendTuyaDP(2, brightness); // DP 2 = brightness
      });
    }
  }
}

module.exports = TuyaMultiSensorDevice;
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Step 1: Create Core Files
- [ ] `lib/TuyaManufacturerCluster.js` - Custom cluster definition
- [ ] `lib/registerClusters.js` - Cluster registration helper
- [ ] `lib/TuyaDPParser.js` - DP parsing/encoding logic
- [ ] `lib/tuya-engine/dp-database.json` - DP mapping database

### Step 2: Update App Initialization
- [ ] Modify `app.js` to call `registerCustomClusters()` on startup
- [ ] Ensure cluster is registered BEFORE any device initialization

### Step 3: Update Device Drivers
- [ ] Modify each Tuya device driver to:
  - [ ] Check for `tuyaManufacturer` cluster
  - [ ] Listen for `dataReport` events
  - [ ] Call `handleTuyaDP()` for incoming DPs
  - [ ] Implement `sendTuyaDP()` for writable capabilities
  - [ ] Keep fallback to standard Zigbee if cluster not found

### Step 4: Populate DP Database
- [ ] Research DP mappings for each device category (use Zigbee2MQTT, ZHA as reference)
- [ ] Add 80+ DP definitions to `dp-database.json`
- [ ] Document each DP with: name, type, capability, scale, readonly, min/max

### Step 5: Test & Validate
- [ ] Test with real Tuya devices
- [ ] Verify DP parsing works
- [ ] Verify capability updates
- [ ] Test writable capabilities (onoff, dim, etc.)
- [ ] Check fallback to standard Zigbee for non-Tuya devices

---

## 🔗 REFERENCE RESOURCES

### Official Documentation
- **node-zigbee-clusters**: https://github.com/athombv/node-zigbee-clusters
- **Homey Zigbee SDK**: https://apps.developer.homey.app/wireless/zigbee
- **Zigbee Cluster Library**: https://zigbeealliance.org/wp-content/uploads/2019/12/07-5123-06-zigbee-cluster-library-specification.pdf

### Community DP Databases
- **Zigbee2MQTT Tuya Converters**: https://github.com/Koenkk/zigbee-herdsman-converters/blob/master/src/devices/tuya.ts
- **ZHA Device Handlers**: https://github.com/zigpy/zha-device-handlers/tree/dev/zhaquirks/tuya
- **Blakadder Tuya Database**: https://zigbee.blakadder.com/tuya.html

### Known DP Mappings (Common)
| DP ID | Name | Type | Typical Use | Capability |
|-------|------|------|------------|------------|
| 1 | Switch/Motion | BOOL | On/Off or Motion detected | `onoff` or `alarm_motion` |
| 2 | Brightness/Position | VALUE | Dimmer level or Cover position | `dim` or `windowcoverings_set` |
| 3 | Min brightness | VALUE | Minimum dim level | `dim.min` |
| 4 | Battery | VALUE | Battery percentage | `measure_battery` |
| 5 | Mode | ENUM | Operating mode | varies |
| 9 | Sensitivity | ENUM | Motion sensitivity | `motion_sensitivity` |
| 10 | Timeout/Duration | VALUE | Motion timeout, etc. | `motion_timeout` |
| 18 | Temperature/Current | VALUE | Temp (×10) or Current (×0.001) | `measure_temperature` or `measure_current` |
| 19 | Power | VALUE | Power in W (×0.1) | `measure_power` |
| 20 | Voltage | VALUE | Voltage in V (×0.1) | `measure_voltage` |

---

## ✅ EXPECTED RESULTS

### Before (Current State)
- ❌ "No Tuya cluster found, using standard Zigbee"
- ❌ Motion not detected
- ❌ Battery not reporting
- ❌ Temperature incorrect or missing
- ❌ "Still no Motion and SOS triggered data"

### After (With DP Implementation)
- ✅ "Tuya manufacturer cluster found"
- ✅ "DP Report: ID=1, Type=BOOL, Value=true → alarm_motion"
- ✅ "DP Report: ID=4, Type=VALUE, Value=87 → measure_battery"
- ✅ "DP Report: ID=18, Type=VALUE, Value=235 → 23.5°C"
- ✅ All 80+ DPs correctly parsed and mapped
- ✅ Motion triggers flows instantly
- ✅ SOS button works
- ✅ All sensors report accurate data

---

## 🎯 INTEGRATION WITH EXISTING PROMPTS

This addendum **extends** the main WindSurf prompts:

1. **WINDSURF_AI_PROMPT.md** - Still apply all those fixes (IAS, Battery, etc.)
2. **WINDSURF_ADDENDUM_FORUM_PRODUCTS.md** - Still request fingerprints for unknown devices
3. **THIS DOCUMENT** - Implement Tuya DP cluster support for proper TS0601 handling

**Execution Order**:
1. Implement main prompt fixes first
2. Add Tuya DP cluster support (this document)
3. Test with TS0601 devices
4. Populate DP database with discovered mappings
5. Document new DPs as they're found

---

END OF TUYA DP CLUSTER ADDENDUM
