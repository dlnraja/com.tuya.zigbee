'use strict';

/**
 * TUYA DP AUTOMATIC MAPPER
 *
 * Inspiré de:
 * - Zigbee2MQTT converters (github.com/Koenkk/zigbee-herdsman-converters)
 * - LocalTuya (github.com/rospogrigio/localtuya)
 * - Home Assistant Tuya integration
 * - TinyTuya (pypi.org/project/tinytuya)
 *
 * Permet de:
 * - Mapper automatiquement les DP vers capabilities Homey
 * - Détecter le type de device depuis les DP
 * - Gérer les conversions (divider, scale, offset)
 * - Supporter les enums et mappings
 * - Auto-générer les listeners
 */

const { getDPInfo } = require('./TuyaDPDatabase');

class TuyaDPMapper {

  /**
   * DP -> Homey Capability mapping patterns
   * Basé sur 1000+ devices Zigbee2MQTT + LocalTuya
   */
  static DP_PATTERNS = {
    // On/Off (switches, plugs, lights)
    1: {
      patterns: ['switch', 'state', 'onoff', 'power'],
      capability: 'onoff',
      type: 0x01, // BOOL
      convert: (value) => !!value
    },

    // Dimmer level (lights, curtains)
    2: {
      patterns: ['level', 'brightness', 'dim', 'position', 'percent'],
      capability: 'dim',
      type: 0x02, // VALUE
      convert: (value) => Math.max(0, Math.min(100, value)) / 100
    },

    // Temperature (sensors, thermostats)
    3: {
      patterns: ['temperature', 'temp', 'current_temp'],
      capability: 'measure_temperature',
      type: 0x02,
      divider: 10,
      convert: (value) => value / 10
    },

    // Battery percentage
    4: {
      patterns: ['battery', 'battery_percentage'],
      capability: 'measure_battery',
      type: 0x02,
      convert: (value) => Math.max(0, Math.min(100, value))
    },
    15: { // Alternative battery DP
      patterns: ['battery', 'battery_alt'],
      capability: 'measure_battery',
      type: 0x02,
      convert: (value) => Math.max(0, Math.min(100, value))
    },

    // Humidity
    5: {
      patterns: ['humidity', 'hum'],
      capability: 'measure_humidity',
      type: 0x02,
      convert: (value) => Math.max(0, Math.min(100, value))
    },

    // Motion detection
    6: {
      patterns: ['motion', 'pir', 'presence'],
      capability: 'alarm_motion',
      type: 0x01,
      convert: (value) => !!value
    },

    // Contact sensor (door/window)
    7: {
      patterns: ['contact', 'door', 'window', 'open'],
      capability: 'alarm_contact',
      type: 0x01,
      convert: (value) => !!value
    },

    // Water leak
    8: {
      patterns: ['water', 'leak', 'water_leak'],
      capability: 'alarm_water',
      type: 0x01,
      convert: (value) => !!value
    },

    // CO detection
    9: {
      patterns: ['co', 'carbon_monoxide'],
      capability: 'alarm_co',
      type: 0x01,
      convert: (value) => !!value
    },

    // Smoke detection
    10: {
      patterns: ['smoke', 'fire'],
      capability: 'alarm_smoke',
      type: 0x01,
      convert: (value) => !!value
    },

    // Illuminance
    11: {
      patterns: ['illuminance', 'lux', 'light', 'brightness_sensor'],
      capability: 'measure_luminance',
      type: 0x02,
      convert: (value) => value
    },

    // PM2.5
    12: {
      patterns: ['pm25', 'pm2_5', 'air_quality'],
      capability: 'measure_pm25',
      type: 0x02,
      convert: (value) => value
    },

    // CO2
    13: {
      patterns: ['co2', 'carbon_dioxide'],
      capability: 'measure_co2',
      type: 0x02,
      convert: (value) => value
    },

    // VOC
    14: {
      patterns: ['voc', 'tvoc'],
      capability: 'measure_voc',
      type: 0x02,
      convert: (value) => value
    },

    // Power consumption
    16: {
      patterns: ['voltage', 'volt'],
      capability: 'measure_voltage',
      type: 0x02,
      divider: 10,
      convert: (value) => value / 10
    },
    17: {
      patterns: ['current', 'amp'],
      capability: 'measure_current',
      type: 0x02,
      divider: 1000,
      convert: (value) => value / 1000
    },
    18: {
      patterns: ['power', 'watt'],
      capability: 'measure_power',
      type: 0x02,
      divider: 10,
      convert: (value) => value / 10
    },
    19: {
      patterns: ['energy', 'kwh'],
      capability: 'meter_power',
      type: 0x02,
      divider: 100,
      convert: (value) => value / 100
    },

    // Child lock
    20: {
      patterns: ['child_lock', 'lock'],
      capability: 'child_lock',
      type: 0x01,
      convert: (value) => !!value
    },

    // Thermostat setpoint
    21: {
      patterns: ['setpoint', 'target_temp', 'target_temperature'],
      capability: 'target_temperature',
      type: 0x02,
      divider: 10,
      convert: (value) => value / 10
    },

    // Mode (various enums)
    22: {
      patterns: ['mode', 'work_mode', 'operation_mode'],
      capability: 'thermostat_mode',
      type: 0x04, // ENUM
      values: {
        0: 'off',
        1: 'auto',
        2: 'manual',
        3: 'heat',
        4: 'cool'
      }
    },

    // ======================================
    // PRESENCE/RADAR SENSOR DPs (24GHz mmWave)
    // Based on Zigbee2MQTT + iHseno + Moes devices
    // ======================================

    // DP 1: Presence (radar)
    101: {
      patterns: ['presence', 'occupancy', 'human_presence'],
      capability: 'alarm_motion',
      type: 0x01,
      convert: (value) => !!value
    },

    // DP 102: Illuminance (lux for radar sensors)
    102: {
      patterns: ['illuminance_value', 'lux_value'],
      capability: 'measure_luminance',
      type: 0x02,
      convert: (value) => value
    },

    // DP 103: Sensitivity (config)
    103: {
      patterns: ['sensitivity', 'radar_sensitivity'],
      capability: null, // Config only
      type: 0x02
    },

    // DP 104: Distance (radar)
    104: {
      patterns: ['target_distance', 'detection_distance'],
      capability: 'measure_distance',
      type: 0x02,
      convert: (value) => value / 100 // cm to m
    },

    // DP 105: Presence state (enum)
    105: {
      patterns: ['presence_state', 'motion_state'],
      capability: 'alarm_motion',
      type: 0x04,
      values: {
        0: false,  // none
        1: true,   // presence
        2: true    // moving
      }
    },

    // DP 106: Fading time (config)
    106: {
      patterns: ['fading_time', 'presence_timeout'],
      capability: null,
      type: 0x02
    },

    // ======================================
    // CLIMATE SENSOR SPECIFIC DPs
    // Based on Tuya temp/humidity sensors
    // ======================================

    // Alternative temperature DP
    24: {
      patterns: ['temperature_alt', 'temp_indoor'],
      capability: 'measure_temperature',
      type: 0x02,
      divider: 10,
      convert: (value) => value / 10
    },

    // Alternative humidity DP
    25: {
      patterns: ['humidity_alt', 'humidity_indoor'],
      capability: 'measure_humidity',
      type: 0x02,
      convert: (value) => value
    },

    // Soil moisture (for soil sensors)
    26: {
      patterns: ['soil_moisture', 'moisture'],
      capability: 'measure_humidity',
      type: 0x02,
      convert: (value) => Math.max(0, Math.min(100, value))
    }
  };

  /**
   * Auto-detect device type from DPs
   */
  static detectDeviceType(dps) {
    const dpNumbers = Array.isArray(dps) ? dps : Object.keys(dps).map(Number);

    // TRV / Thermostat
    if (dpNumbers.includes(2) && dpNumbers.includes(3) && dpNumbers.includes(4)) {
      if (dpNumbers.includes(21)) return 'trv';
      return 'thermostat';
    }

    // Climate sensor
    if (dpNumbers.includes(1) && dpNumbers.includes(2) && dpNumbers.includes(4)) {
      return 'climate_sensor';
    }

    // Motion sensor
    if (dpNumbers.includes(1) && dpNumbers.includes(4) && dpNumbers.includes(6)) {
      return 'motion_sensor';
    }

    // Contact sensor
    if (dpNumbers.includes(7) && dpNumbers.includes(4)) {
      return 'contact_sensor';
    }

    // Water leak
    if (dpNumbers.includes(8) && dpNumbers.includes(4)) {
      return 'water_sensor';
    }

    // Smart plug with energy
    if (dpNumbers.includes(1) && dpNumbers.includes(18) && dpNumbers.includes(19)) {
      return 'smart_plug_energy';
    }

    // Switch/Dimmer
    if (dpNumbers.includes(1) && dpNumbers.includes(2)) {
      return 'dimmer';
    }

    // Simple switch
    if (dpNumbers.includes(1)) {
      return 'switch';
    }

    return 'unknown';
  }

  /**
   * Map DP to Homey capability
   */
  static mapDPToCapability(dp, value = null) {
    const pattern = this.DP_PATTERNS[dp];
    if (!pattern) return null;

    return {
      dp,
      capability: pattern.capability,
      type: pattern.type,
      convert: pattern.convert,
      divider: pattern.divider,
      values: pattern.values
    };
  }

  /**
   * Convert DP value to Homey value
   */
  static convertValue(dp, rawValue, dpInfo = null) {
    // Get pattern
    const pattern = this.DP_PATTERNS[dp] || dpInfo;
    if (!pattern) return rawValue;

    // Apply conversion function
    if (pattern.convert && typeof pattern.convert === 'function') {
      try {
        return pattern.convert(rawValue);
      } catch (err) {
        console.error(`DP ${dp} conversion failed:`, err);
        return rawValue;
      }
    }

    // Apply divider
    if (pattern.divider && typeof rawValue === 'number') {
      return rawValue / pattern.divider;
    }

    // Apply enum mapping
    if (pattern.values && typeof rawValue === 'number') {
      return pattern.values[rawValue] || rawValue;
    }

    return rawValue;
  }

  /**
   * Convert Homey value to DP value
   */
  static convertToDP(dp, homeyValue, dpInfo = null) {
    const pattern = this.DP_PATTERNS[dp] || dpInfo;
    if (!pattern) return homeyValue;

    // Reverse enum mapping
    if (pattern.values) {
      for (const [key, val] of Object.entries(pattern.values)) {
        if (val === homeyValue) return parseInt(key);
      }
    }

    // Reverse divider
    if (pattern.divider && typeof homeyValue === 'number') {
      return Math.round(homeyValue * pattern.divider);
    }

    // Boolean to number
    if (pattern.type === 0x01 && typeof homeyValue === 'boolean') {
      return homeyValue ? 1 : 0;
    }

    // Dim percentage to 0-100
    if (pattern.capability === 'dim' && typeof homeyValue === 'number') {
      return Math.round(homeyValue * 100);
    }

    return homeyValue;
  }

  /**
   * Generate capability listeners for device
   */
  static generateCapabilityListeners(device, manufacturerName, modelId) {
    const listeners = [];

    // Get known DPs for this device
    const dpInfo = getDPInfo(null, manufacturerName, modelId);
    if (!dpInfo) {
      device.log('[DP-MAPPER] No known DP profile for this device');
      return listeners;
    }

    // Generate listener for each writable DP
    const writableDPs = [1, 2, 21]; // Common writable DPs (switch, dim, setpoint)

    for (const dp of writableDPs) {
      const mapping = this.mapDPToCapability(dp);
      if (!mapping) continue;

      const { capability } = mapping;

      listeners.push({
        capability,
        dp,
        handler: async (value) => {
          device.log(`[DP-MAPPER] ${capability} -> DP ${dp}: ${value}`);

          // Convert value
          const dpValue = this.convertToDP(dp, value, mapping);

          // Send to device
          if (device.tuyaEF00Manager) {
            await device.tuyaEF00Manager.sendTuyaDP(dp, mapping.type, dpValue);
          }
        }
      });
    }

    return listeners;
  }

  /**
   * Generate DP listeners for device
   */
  static generateDPListeners(device, manufacturerName, modelId) {
    const listeners = [];

    // Get known DPs for this device
    const dpInfo = getDPInfo(null, manufacturerName, modelId);
    if (!dpInfo) {
      device.log('[DP-MAPPER] No known DP profile');
      return listeners;
    }

    // Generate listener for each readable DP
    for (const dp of Object.keys(this.DP_PATTERNS).map(Number)) {
      const mapping = this.mapDPToCapability(dp);
      if (!mapping) continue;

      const { capability } = mapping;

      listeners.push({
        dp,
        capability,
        handler: (value) => {
          device.log(`[DP-MAPPER] DP ${dp} -> ${capability}: ${value}`);

          // Convert value
          const homeyValue = this.convertValue(dp, value, mapping);

          // Update capability
          if (device.hasCapability(capability)) {
            device.setCapabilityValue(capability, homeyValue).catch(device.error);
          }
        }
      });
    }

    return listeners;
  }

  /**
   * Auto-setup device with DP mapping
   */
  static async autoSetup(device, zclNode) {
    device.log('[DP-MAPPER] 🤖 Auto-setup starting...');

    const manufacturerName = zclNode.manufacturerName;
    const modelId = zclNode.modelId;

    device.log(`[DP-MAPPER] Device: ${manufacturerName} / ${modelId}`);

    // Setup DP listeners
    const dpListeners = this.generateDPListeners(device, manufacturerName, modelId);
    for (const listener of dpListeners) {
      if (device.tuyaEF00Manager) {
        device.tuyaEF00Manager.on(`dp-${listener.dp}`, listener.handler);
        device.log(`[DP-MAPPER] ✅ Listening: DP ${listener.dp} -> ${listener.capability}`);
      }
    }

    // Setup capability listeners
    const capListeners = this.generateCapabilityListeners(device, manufacturerName, modelId);
    for (const listener of capListeners) {
      device.registerCapabilityListener(listener.capability, listener.handler);
      device.log(`[DP-MAPPER] ✅ Writable: ${listener.capability} -> DP ${listener.dp}`);
    }

    device.log(`[DP-MAPPER] ✅ Auto-setup complete (${dpListeners.length} DPs, ${capListeners.length} capabilities)`);

    return {
      dpListeners,
      capListeners
    };
  }
}

module.exports = TuyaDPMapper;
