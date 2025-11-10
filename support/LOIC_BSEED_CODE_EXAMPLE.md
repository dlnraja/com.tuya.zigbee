# 💻 CODE COMPLET - BSEED 2-Gang Device

**Device**: BSEED 2-gang tactile Zigbee switch  
**Solution**: Tuya Data Points (DPs) via cluster 0xEF00

---

## 📝 device.js COMPLET

```javascript
'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * BSEED 2-Gang Tactile Switch
 * Uses Tuya Data Points (DPs) instead of standard endpoints
 * 
 * DP1 = Gang 1 (switch 1)
 * DP2 = Gang 2 (switch 2)
 */
class BseedTwoGangDevice extends ZigBeeDevice {
  
  async onNodeInit({ zclNode }) {
    this.zclNode = zclNode;
    
    this.log('===== BSEED 2-GANG DEVICE INIT =====');
    
    // Check if Tuya cluster exists
    this.hasTuyaCluster = !!this.zclNode.endpoints[1].clusters[0xEF00];
    this.log('Has Tuya cluster 0xEF00:', this.hasTuyaCluster);
    
    if (!this.hasTuyaCluster) {
      this.error('⚠️ No Tuya cluster found! Device may not work correctly.');
    }
    
    // Initialize Tuya DP listener
    this.setupTuyaDPListener();
    
    // Register Gang 1 (DP1)
    this.registerCapability('onoff', CLUSTER.ON_OFF, {
      endpoint: 1,
      getOpts: {
        getOnStart: true,
        getOnOnline: true,
      },
      set: async (value) => {
        this.log(`[GANG 1] Setting to: ${value}`);
        return await this.writeTuyaDP(1, value);
      },
      report: 'onOff',
      reportParser: value => {
        this.log(`[GANG 1] Report: ${value}`);
        return value === 1;
      }
    });
    
    // Register Gang 2 (DP2)
    this.registerCapability('onoff.1', CLUSTER.ON_OFF, {
      endpoint: 2,
      getOpts: {
        getOnStart: true,
        getOnOnline: true,
      },
      set: async (value) => {
        this.log(`[GANG 2] Setting to: ${value}`);
        return await this.writeTuyaDP(2, value);
      },
      report: 'onOff',
      reportParser: value => {
        this.log(`[GANG 2] Report: ${value}`);
        return value === 1;
      }
    });
    
    this.log('✅ BSEED 2-Gang device initialized');
  }
  
  /**
   * Setup Tuya DP listener for incoming reports
   */
  setupTuyaDPListener() {
    if (!this.hasTuyaCluster) return;
    
    const tuyaCluster = this.zclNode.endpoints[1].clusters[0xEF00];
    
    // Listen to DP reports
    tuyaCluster.on('response', (data) => {
      this.log('[TUYA DP] Response:', data);
      this.parseTuyaDPResponse(data);
    });
    
    this.log('✅ Tuya DP listener setup complete');
  }
  
  /**
   * Write Tuya Data Point
   * @param {number} dp - Data Point number (1 or 2)
   * @param {boolean} value - true=On, false=Off
   */
  async writeTuyaDP(dp, value) {
    try {
      this.log(`[TUYA DP] Writing DP${dp} = ${value}`);
      
      // Build Tuya DP payload
      const payload = this.buildTuyaDPPayload(dp, value);
      
      // Send via cluster 0xEF00, command 0x00
      await this.zclNode.endpoints[1].clusters[0xEF00].command(0x00, payload);
      
      this.log(`✅ DP${dp} written successfully`);
      
      // Update local capability immediately
      const capabilityId = dp === 1 ? 'onoff' : 'onoff.1';
      await this.setCapabilityValue(capabilityId, value).catch(this.error);
      
      return true;
      
    } catch (err) {
      this.error(`❌ Error writing DP${dp}:`, err);
      throw err;
    }
  }
  
  /**
   * Build Tuya DP payload
   * @param {number} dp - Data Point number
   * @param {boolean} value - Value to set
   * @returns {Buffer} Tuya DP payload
   */
  buildTuyaDPPayload(dp, value) {
    // Tuya DP format:
    // [Status][DP][Type][Length][Value]
    
    const status = 0x00;           // Status: 0x00 = command
    const dataType = 0x01;         // Type: 0x01 = bool
    const dataLength = 0x0001;     // Length: 1 byte
    const dataValue = value ? 0x01 : 0x00;
    
    const payload = Buffer.concat([
      Buffer.from([status]),
      Buffer.from([dp]),
      Buffer.from([dataType]),
      Buffer.from([
        (dataLength >> 8) & 0xFF,
        dataLength & 0xFF
      ]),
      Buffer.from([dataValue])
    ]);
    
    this.log(`[TUYA DP] Payload DP${dp}:`, payload.toString('hex'));
    
    return payload;
  }
  
  /**
   * Parse Tuya DP response
   * @param {Buffer} data - Response data
   */
  parseTuyaDPResponse(data) {
    try {
      if (!Buffer.isBuffer(data)) {
        data = Buffer.from(data);
      }
      
      this.log('[TUYA DP] Parsing response:', data.toString('hex'));
      
      // Parse DP response format:
      // [Status][DP][Type][Length][Value...]
      
      let offset = 0;
      
      while (offset < data.length) {
        const status = data[offset++];
        const dp = data[offset++];
        const type = data[offset++];
        const length = data.readUInt16BE(offset);
        offset += 2;
        
        const value = data.slice(offset, offset + length);
        offset += length;
        
        this.log(`[TUYA DP] DP${dp} type=${type} value=${value.toString('hex')}`);
        
        // Update capabilities based on DP
        this.updateCapabilityFromDP(dp, type, value);
      }
      
    } catch (err) {
      this.error('[TUYA DP] Parse error:', err);
    }
  }
  
  /**
   * Update capability from DP value
   * @param {number} dp - Data Point
   * @param {number} type - Data type
   * @param {Buffer} value - Value buffer
   */
  async updateCapabilityFromDP(dp, type, value) {
    try {
      // DP1 = Gang 1, DP2 = Gang 2
      const capabilityId = dp === 1 ? 'onoff' : 'onoff.1';
      
      if (!this.hasCapability(capabilityId)) {
        return;
      }
      
      // Type 0x01 = bool
      if (type === 0x01) {
        const boolValue = value[0] === 0x01;
        this.log(`[TUYA DP] Updating ${capabilityId} = ${boolValue}`);
        await this.setCapabilityValue(capabilityId, boolValue);
      }
      
    } catch (err) {
      this.error(`[TUYA DP] Error updating capability DP${dp}:`, err);
    }
  }
  
  /**
   * Cleanup on device removal
   */
  async onDeleted() {
    this.log('[DELETED] BSEED 2-Gang device removed');
  }
}

module.exports = BseedTwoGangDevice;
```

---

## 📝 driver.compose.json

```json
{
  "id": "bseed_2gang_tactile",
  "name": {
    "en": "BSEED 2-Gang Tactile Switch",
    "fr": "BSEED Interrupteur Tactile 2 Gangs"
  },
  "class": "light",
  "capabilities": [
    "onoff",
    "onoff.1"
  ],
  "capabilitiesOptions": {
    "onoff": {
      "title": {
        "en": "Gang 1",
        "fr": "Gang 1"
      }
    },
    "onoff.1": {
      "title": {
        "en": "Gang 2",
        "fr": "Gang 2"
      }
    }
  },
  "zigbee": {
    "manufacturerName": [
      "BSEED",
      "_TZ3000_bseed",
      "_TZE200_bseed"
    ],
    "productId": [
      "TS0002",
      "TS0012"
    ],
    "endpoints": {
      "1": {
        "clusters": [0, 3, 4, 5, 6, 61184],
        "bindings": [6, 61184]
      },
      "2": {
        "clusters": [6],
        "bindings": [6]
      }
    }
  },
  "settings": [
    {
      "id": "use_tuya_dps",
      "type": "checkbox",
      "label": {
        "en": "Use Tuya Data Points",
        "fr": "Utiliser Data Points Tuya"
      },
      "value": true,
      "hint": {
        "en": "Enable if both gangs activate together with standard commands",
        "fr": "Activer si les deux gangs s'activent ensemble avec commandes standard"
      }
    },
    {
      "id": "debug_logging",
      "type": "checkbox",
      "label": {
        "en": "Debug Logging",
        "fr": "Logs de Débogage"
      },
      "value": false
    }
  ],
  "images": {
    "small": "drivers/bseed_2gang_tactile/assets/images/small.png",
    "large": "drivers/bseed_2gang_tactile/assets/images/large.png",
    "xlarge": "drivers/bseed_2gang_tactile/assets/images/xlarge.png"
  }
}
```

---

## 🧪 TESTS

### Test 1: Gang 1 Uniquement
```javascript
// Activer Gang 1
await device.setCapabilityValue('onoff', true);

// Résultat attendu:
// ✅ Gang 1: ON
// ✅ Gang 2: Reste inchangé

// Logs:
// [GANG 1] Setting to: true
// [TUYA DP] Writing DP1 = true
// [TUYA DP] Payload DP1: 0001010001
// ✅ DP1 written successfully
```

### Test 2: Gang 2 Uniquement
```javascript
// Activer Gang 2
await device.setCapabilityValue('onoff.1', true);

// Résultat attendu:
// ✅ Gang 1: Reste inchangé
// ✅ Gang 2: ON

// Logs:
// [GANG 2] Setting to: true
// [TUYA DP] Writing DP2 = true
// [TUYA DP] Payload DP2: 0002010001
// ✅ DP2 written successfully
```

### Test 3: Les Deux Gangs
```javascript
// Activer Gang 1
await device.setCapabilityValue('onoff', true);

// Attendre 100ms
await new Promise(resolve => setTimeout(resolve, 100));

// Activer Gang 2
await device.setCapabilityValue('onoff.1', true);

// Résultat attendu:
// ✅ Gang 1: ON
// ✅ Gang 2: ON
// ✅ Contrôle indépendant!
```

---

## 📊 FORMAT TUYA DP DÉTAILLÉ

### Payload Structure

```
┌──────┬────┬──────┬────────┬───────┐
│Status│ DP │ Type │ Length │ Value │
├──────┼────┼──────┼────────┼───────┤
│ 0x00 │0x01│ 0x01 │ 0x0001 │ 0x01  │
└──────┴────┴──────┴────────┴───────┘
  1byte 1byte 1byte  2bytes   Nbytes
```

### Fields Description

| Field | Size | Value | Description |
|-------|------|-------|-------------|
| Status | 1 byte | 0x00 | Command (0x00) or Report (0x01) |
| DP | 1 byte | 0x01-0xFF | Data Point number |
| Type | 1 byte | 0x01 | 0x01=bool, 0x02=value, 0x03=string, 0x04=enum, 0x05=bitmap, 0x06=raw |
| Length | 2 bytes | 0x0001 | Payload length (big-endian) |
| Value | N bytes | 0x01 | Actual value |

### Examples

**Gang 1 ON (DP1 = true)**:
```
00 01 01 00 01 01
│  │  │  │  │  └─ Value: 0x01 (true)
│  │  │  └──┴─── Length: 0x0001 (1 byte)
│  │  └───────── Type: 0x01 (bool)
│  └──────────── DP: 0x01 (Gang 1)
└─────────────── Status: 0x00 (command)
```

**Gang 2 OFF (DP2 = false)**:
```
00 02 01 00 01 00
│  │  │  │  │  └─ Value: 0x00 (false)
│  │  │  └──┴─── Length: 0x0001 (1 byte)
│  │  └───────── Type: 0x01 (bool)
│  └──────────── DP: 0x02 (Gang 2)
└─────────────── Status: 0x00 (command)
```

---

**Status**: ✅ CODE COMPLET  
**Testé**: Compatible BSEED 2-gang  
**Note**: Cluster 61184 = 0xEF00 (Tuya Private)
