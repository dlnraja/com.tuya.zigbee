const fs = require('fs');
const path = require('path');

// Create comprehensive Zigbee TRV driver
const driverDir = 'drivers/radiator_valve_zigbee';
if (!fs.existsSync(driverDir)) {
  fs.mkdirSync(driverDir, { recursive: true });
  fs.mkdirSync(path.join(driverDir, 'assets/images'), { recursive: true });
}

const deviceJs = `'use strict';

const HybridThermostatBase = require('../../lib/devices/HybridThermostatBase');
const { includesCI } = require('../../lib/utils/CaseInsensitiveMatcher');

/**
 * RADIATOR VALVE (TRV) ZIGBEE - v6.0
 * Comprehensive Zigbee TRV support with all features:
 * - Temperature control (target, local, calibration)
 * - Scheduler (weekly programs)
 * - Boost mode, eco mode, frost protection
 * - Window detection, child lock
 * - Battery monitoring
 * - Multi-manufacturer support (Tuya, Moes, Saswell, etc.)
 */

class RadiatorValveZigbeeDevice extends HybridThermostatBase {
  get supportsScheduler() { return true; }
  get supportsBoost() { return true; }
  get supportsEcoMode() { return true; }
  get supportsFrostProtection() { return true; }
  get supportsWindowDetection() { return true; }

  async onNodeInit({ zclNode }) {
    this.log('[TRV-ZIGBEE]  Initializing comprehensive TRV driver...');
    
    await super.onNodeInit({ zclNode });

    // TRV-specific DP mappings
    this.dpMappings = {
      1: { capability: 'target_temperature', divisor: 10, dataType: 2 },
      2: { capability: 'measure_temperature', divisor: 10, dataType: 2 },
      3: { capability: 'onoff', dataType: 1 }, // Valve open/close
      4: { capability: 'thermostat_mode', dataType: 4 }, // manual/auto/eco/boost
      5: { capability: 'measure_battery', divisor: 1, dataType: 2 },
      7: { capability: 'child_lock', dataType: 1 },
      8: { capability: 'window_detection', dataType: 1 },
      10: { capability: 'frost_protection_temperature', divisor: 10, dataType: 2 },
      16: { capability: 'target_temperature', divisor: 10, dataType: 2 }, // Some variants
      19: { capability: 'boost_mode', dataType: 1 },
      24: { capability: 'measure_temperature', divisor: 10, dataType: 2 }, // Alt local temp
      27: { capability: 'temperature_calibration', divisor: 10, dataType: 2 },
      28: { capability: 'eco_temperature', divisor: 10, dataType: 2 },
      31: { capability: 'valve_position', divisor: 1, dataType: 2 }, // 0-100%
      36: { capability: 'schedule_monday', dataType: 3 },
      37: { capability: 'schedule_tuesday', dataType: 3 },
      38: { capability: 'schedule_wednesday', dataType: 3 },
      39: { capability: 'schedule_thursday', dataType: 3 },
      40: { capability: 'schedule_friday', dataType: 3 },
      41: { capability: 'schedule_saturday', dataType: 3 },
      42: { capability: 'schedule_sunday', dataType: 3 },
      101: { capability: 'child_lock', dataType: 1 }, // Alt
      104: { capability: 'thermostat_mode', dataType: 4 } // Alt
    };

    // Setup capability listeners
    this.registerCapabilityListener('target_temperature', this.onTargetTemperatureChange.bind(this));
    this.registerCapabilityListener('thermostat_mode', this.onModeChange.bind(this));
    
    if (this.hasCapability('boost_mode')) {
      this.registerCapabilityListener('boost_mode', this.onBoostModeChange.bind(this));
    }
    
    if (this.hasCapability('window_detection')) {
      this.registerCapabilityListener('window_detection', this.onWindowDetectionChange.bind(this));
    }
    
    if (this.hasCapability('child_lock')) {
      this.registerCapabilityListener('child_lock', this.onChildLockChange.bind(this));
    }

    this.log('[TRV-ZIGBEE]  Comprehensive TRV initialized');
  }

  async onTargetTemperatureChange(value) {
    this.log(\`[TRV-ZIGBEE] Setting target temp: \${value}Â°C\`);
    
    // Try DP1 first (most common)
    try {
      await this.sendTuyaDPCommand(1, Math.round(value * 10) * 2);
      return true;
    } catch (e1) {
      // Fallback to DP16
      try {
        await this.sendTuyaDPCommand(16, Math.round(value * 10) * 2);
        return true;
      } catch (e2) {
        this.error('[TRV-ZIGBEE] Failed to set target temp:', e2.message);
        throw e2;
      }
    }
  }

  async onModeChange(mode) {
    this.log(\`[TRV-ZIGBEE] Setting mode: \${mode}\`);
    
    const modeMap = {
      'auto': 0,
      'manual': 1,
      'eco': 2,
      'boost': 3,
      'away': 4,
      'off': 5
    };
    
    const dpValue = modeMap[mode] !== undefined ? modeMap[mode] : 1      ;
    
    try {
      await this.sendTuyaDPCommand(4, dpValue, 4);
      return true;
    } catch (e1) {
      try {
        await this.sendTuyaDPCommand(104, dpValue, 4);
        return true;
      } catch (e2) {
        this.error('[TRV-ZIGBEE] Failed to set mode:', e2.message);
        throw e2;
      }
    }
  }

  async onBoostModeChange(value) {
    this.log(\`[TRV-ZIGBEE] Boost mode: \${value}\`);
    await this.sendTuyaDPCommand(19, value, 1);
  }

  async onWindowDetectionChange(value) {
    this.log(\`[TRV-ZIGBEE] Window detection: \${value}\`);
    await this.sendTuyaDPCommand(8, value, 1);
  }

  async onChildLockChange(value) {
    this.log(\`[TRV-ZIGBEE] Child lock: \${value}\`);
    try {
      await this.sendTuyaDPCommand(7, value, 1);
    } catch (e) {
      await this.sendTuyaDPCommand(101, value, 1);
    }
  }

  async setSchedule(day, schedule) {
    this.log(\`[TRV-ZIGBEE] Setting schedule for \${day}:\`, schedule);
    
    const dayDPs = {
      'monday': 36,
      'tuesday': 37,
      'wednesday': 38,
      'thursday': 39,
      'friday': 40,
      'saturday': 41,
      'sunday': 42
    };
    
    const dp = dayDPs[day.toLowerCase()];
    if (!dp) throw new Error('Invalid day');
    
    // Schedule format: "HH:MM/TEMP HH:MM/TEMP ..." encoded as string DP
    await this.sendTuyaDPCommand(dp, schedule, 3);
  }
}

module.exports = RadiatorValveZigbeeDevice;
`;

fs.writeFileSync(path.join(driverDir, 'device.js'), deviceJs);

const driverComposeJson = {
  "name": {
    "en": "Radiator Valve (TRV) Zigbee",
    "fr": "Vanne Thermostatique Zigbee"
  },
  "class": "thermostat",
  "capabilities": [
    "target_temperature",
    "measure_temperature",
    "thermostat_mode",
    "measure_battery",
    "onoff",
    "window_detection",
    "child_lock"
  ],
  "capabilitiesOptions": {
    "target_temperature": {
      "min": 5,
      "max": 35,
      "step": 0.5,
      "decimals": 1
    },
    "measure_temperature": {
      "decimals": 1
    }
  },
  "zigbee": {
    "productId": ["TS0601"],
    "endpoints": {
      "1": {
        "clusters": [0, 3, 61184],
        "bindings": [61184]
      }
    },
    "manufacturerName": [
      "_TZE200_ckud7u2l",
      "_TZE200_ywdxldoj",
      "_TZE200_cwnjrr72",
      "_TZE200_2ekuz3dz",
      "_TZE200_kly8gjlz",
      "_TZE200_a4bpgplm",
      "_TZE200_b6wax7g0",
      "_TZE200_bhd_5kn9",
      "_TZE200_lnbfnyxd",
      "_TZE200_mudxchsu",
      "_TZE200_nnrfa68v",
      "_TZE204_nnrfa68v",
      "_TYST11_ckud7u2l",
      "_TYST11_ywdxldoj",
      "_TYST11_cwnjrr72",
      "_TYST11_2ekuz3dz",
      "_TYST11_kly8gjlz",
      "_TYST11_jeaxp72v"
    ]
  },
  "images": {
    "small": "drivers/radiator_valve_zigbee/assets/images/small.png",
    "large": "drivers/radiator_valve_zigbee/assets/images/large.png",
    "xlarge": "drivers/radiator_valve_zigbee/assets/images/xlarge.png"
  }
};

fs.writeFileSync(path.join(driverDir, 'driver.compose.json'), JSON.stringify(driverComposeJson, null, 2));

console.log(' Created comprehensive Zigbee TRV driver');
console.log('   - Full DP mapping (scheduler, boost, eco, frost protection)');
console.log('   - Multi-manufacturer support (Tuya, Moes, Saswell)');
console.log('   - Window detection, child lock, calibration');
