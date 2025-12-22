'use strict';

/**
 * 📡 RAW DATA PARSER
 *
 * Universal parser pour données raw Tuya/Zigbee
 *
 * Sources d'inspiration:
 * - Zigbee2MQTT converters
 * - ZHA quirks database
 * - Tuya developer docs
 * - Johan Bendz community contributions
 *
 * Supports:
 * - ✅ Tuya EF00 datapoints (raw/value/bool/string/enum)
 * - ✅ Zigbee standard clusters
 * - ✅ Climate sensors (temp/humidity/pressure)
 * - ✅ Soil sensors (moisture/conductivity)
 * - ✅ PIR sensors (motion/illuminance/occupancy)
 * - ✅ Energy monitoring (power/energy/voltage/current)
 */

class RawDataParser {

  constructor(device) {
    this.device = device;

    // DP Type definitions (from Tuya spec)
    this.DP_TYPES = {
      RAW: 0x00,
      BOOL: 0x01,
      VALUE: 0x02,
      STRING: 0x03,
      ENUM: 0x04,
      BITMAP: 0x05
    };

    // Common DP mappings (from Zigbee2MQTT + community)
    this.COMMON_DPS = {
      // Power/Control
      1: { name: 'state', type: 'bool', capability: 'onoff' },
      2: { name: 'mode', type: 'enum', capability: 'mode' },
      3: { name: 'brightness', type: 'value', capability: 'dim', parser: v => v / 1000 },
      4: { name: 'color_temp', type: 'value', capability: 'light_temperature' },
      5: { name: 'color', type: 'string', capability: 'light_hue' },

      // Climate sensors
      16: { name: 'temperature', type: 'value', capability: 'measure_temperature', parser: v => v / 10 },
      17: { name: 'humidity', type: 'value', capability: 'measure_humidity', parser: v => v },
      18: { name: 'illuminance', type: 'value', capability: 'measure_luminance', parser: v => v },
      19: { name: 'pressure', type: 'value', capability: 'measure_pressure', parser: v => v / 10 },

      // Soil sensors
      20: { name: 'soil_moisture', type: 'value', capability: 'measure_humidity.soil', parser: v => v },
      21: { name: 'soil_temperature', type: 'value', capability: 'measure_temperature.soil', parser: v => v / 10 },
      22: { name: 'soil_conductivity', type: 'value', capability: 'measure_conductivity', parser: v => v },

      // Motion/Occupancy
      101: { name: 'motion', type: 'bool', capability: 'alarm_motion' },
      102: { name: 'occupancy', type: 'bool', capability: 'alarm_occupancy' },
      103: { name: 'contact', type: 'bool', capability: 'alarm_contact' },
      104: { name: 'water_leak', type: 'bool', capability: 'alarm_water' },
      105: { name: 'smoke', type: 'bool', capability: 'alarm_smoke' },
      106: { name: 'gas', type: 'bool', capability: 'alarm_co' },

      // Battery (multiple possible DPs)
      15: { name: 'battery', type: 'value', capability: 'measure_battery', parser: v => v },
      14: { name: 'battery_level', type: 'enum', capability: 'measure_battery', parser: this.parseBatteryLevel.bind(this) },
      33: { name: 'battery_state', type: 'enum', capability: 'alarm_battery' },

      // Energy monitoring
      6: { name: 'power', type: 'value', capability: 'measure_power', parser: v => v / 10 },
      7: { name: 'current', type: 'value', capability: 'measure_current', parser: v => v / 1000 },
      8: { name: 'voltage', type: 'value', capability: 'measure_voltage', parser: v => v / 10 },
      9: { name: 'energy', type: 'value', capability: 'meter_power', parser: v => v / 100 },

      // Settings
      100: { name: 'sensitivity', type: 'enum', capability: 'sensitivity' },
      107: { name: 'presence_time', type: 'value', capability: 'delay' },
      108: { name: 'led_enable', type: 'bool', capability: 'led' }
    };

    // Cluster attribute parsers
    this.CLUSTER_PARSERS = {
      // Temperature Measurement (0x0402 / 1026)
      1026: {
        measuredValue: (value) => ({
          capability: 'measure_temperature',
          value: value / 100 // centiCelsius to Celsius
        })
      },

      // Relative Humidity (0x0405 / 1029)
      1029: {
        measuredValue: (value) => ({
          capability: 'measure_humidity',
          value: value / 100 // percentage * 100
        })
      },

      // Pressure Measurement (0x0403 / 1027)
      1027: {
        measuredValue: (value) => ({
          capability: 'measure_pressure',
          value: value / 10 // hectoPascals
        })
      },

      // Illuminance Measurement (0x0400 / 1024)
      1024: {
        measuredValue: (value) => ({
          capability: 'measure_luminance',
          value: Math.pow(10, (value - 1) / 10000) // lux formula
        })
      },

      // Occupancy Sensing (0x0406 / 1030)
      1030: {
        occupancy: (value) => ({
          capability: 'alarm_motion',
          value: (value & 0x01) !== 0
        })
      },

      // IAS Zone (0x0500 / 1280)
      1280: {
        zoneStatus: (value) => {
          const status = typeof value.valueOf === 'function' ? value.valueOf() : value;
          return {
            alarm_motion: (status & 0x01) !== 0,
            alarm_tamper: (status & 0x04) !== 0,
            alarm_battery: (status & 0x08) !== 0
          };
        }
      },

      // Power Configuration (0x0001 / 1)
      1: {
        batteryPercentageRemaining: (value) => ({
          capability: 'measure_battery',
          value: value / 2 // 200 = 100%
        }),
        batteryVoltage: (value) => ({
          capability: 'measure_voltage.battery',
          value: value / 10 // deciVolts
        })
      },

      // Electrical Measurement (0x0B04 / 2820)
      2820: {
        activePower: (value) => ({
          capability: 'measure_power',
          value: value
        }),
        rmsCurrent: (value) => ({
          capability: 'measure_current',
          value: value / 1000 // mA to A
        }),
        rmsVoltage: (value) => ({
          capability: 'measure_voltage',
          value: value
        })
      },

      // Metering (0x0702 / 1794)
      1794: {
        currentSummationDelivered: (value) => ({
          capability: 'meter_power',
          value: value / 1000 // Wh to kWh
        })
      }
    };
  }

  /**
   * 📦 Parse Tuya DP datapoint
   */
  parseTuyaDP(dp, datatype, data) {
    this.device.log(`[RAW_PARSER] Parsing Tuya DP ${dp}, type=${datatype}, data=${data.toString('hex')}`);

    // Parse value based on datatype
    let rawValue;

    switch (datatype) {
    case this.DP_TYPES.RAW:
      rawValue = data;
      break;

    case this.DP_TYPES.BOOL:
      rawValue = data.readUInt8(0) === 1;
      break;

    case this.DP_TYPES.VALUE:
      rawValue = data.readUInt32BE(0);
      break;

    case this.DP_TYPES.STRING:
      rawValue = data.toString('utf8');
      break;

    case this.DP_TYPES.ENUM:
      rawValue = data.readUInt8(0);
      break;

    case this.DP_TYPES.BITMAP:
      rawValue = data.readUInt32BE(0);
      break;

    default:
      this.device.log(`[RAW_PARSER] Unknown datatype: ${datatype}`);
      rawValue = data;
    }

    this.device.log(`[RAW_PARSER] Raw value: ${JSON.stringify(rawValue)}`);

    // Try to map to capability
    const mapping = this.COMMON_DPS[dp];

    if (mapping) {
      let parsedValue = rawValue;

      // Apply custom parser if defined
      if (mapping.parser && typeof mapping.parser === 'function') {
        parsedValue = mapping.parser(rawValue);
      }

      this.device.log(`[RAW_PARSER] ✅ Mapped DP${dp} → ${mapping.capability} = ${parsedValue}`);

      return {
        dp,
        name: mapping.name,
        capability: mapping.capability,
        value: parsedValue,
        raw: rawValue
      };
    }

    // Unknown DP - log for future implementation
    this.device.log(`[RAW_PARSER] ⚠️  Unknown DP${dp}: ${JSON.stringify(rawValue)}`);

    return {
      dp,
      name: `dp_${dp}`,
      capability: null,
      value: rawValue,
      raw: rawValue
    };
  }

  /**
   * 📡 Parse Zigbee cluster attribute
   */
  parseZigbeeAttribute(clusterId, attributeName, value) {
    this.device.log(`[RAW_PARSER] Parsing Zigbee cluster ${clusterId}, attr=${attributeName}, value=${value}`);

    const clusterParser = this.CLUSTER_PARSERS[clusterId];

    if (!clusterParser) {
      this.device.log(`[RAW_PARSER] No parser for cluster ${clusterId}`);
      return null;
    }

    const attributeParser = clusterParser[attributeName];

    if (!attributeParser) {
      this.device.log(`[RAW_PARSER] No parser for attribute ${attributeName}`);
      return null;
    }

    const parsed = attributeParser(value);

    this.device.log(`[RAW_PARSER] ✅ Parsed: ${JSON.stringify(parsed)}`);

    return parsed;
  }

  /**
   * 🔋 Parse battery level enum
   * Some devices report battery as enum (0=low, 1=mid, 2=high)
   */
  parseBatteryLevel(enumValue) {
    const mapping = {
      0: 10,  // low
      1: 50,  // medium
      2: 100  // high
    };

    return mapping[enumValue] || 50;
  }

  /**
   * 🌡️  Parse climate data (temperature + humidity combined)
   */
  parseClimateData(buffer) {
    if (buffer.length < 4) {
      this.device.log('[RAW_PARSER] Climate data too short');
      return null;
    }

    try {
      // Common format: [temp:2 bytes][humidity:2 bytes]
      const temp = buffer.readInt16BE(0) / 10; // signed, divided by 10
      const humidity = buffer.readUInt16BE(2) / 10; // unsigned, divided by 10

      return {
        temperature: temp,
        humidity: humidity
      };
    } catch (err) {
      this.device.log('[RAW_PARSER] Failed to parse climate data:', err.message);
      return null;
    }
  }

  /**
   * 🌱 Parse soil sensor data
   */
  parseSoilData(buffer) {
    if (buffer.length < 6) {
      this.device.log('[RAW_PARSER] Soil data too short');
      return null;
    }

    try {
      // Format: [moisture:2][temp:2][conductivity:2]
      const moisture = buffer.readUInt16BE(0); // percentage
      const temp = buffer.readInt16BE(2) / 10; // Celsius
      const conductivity = buffer.readUInt16BE(4); // µS/cm

      return {
        moisture,
        temperature: temp,
        conductivity
      };
    } catch (err) {
      this.device.log('[RAW_PARSER] Failed to parse soil data:', err.message);
      return null;
    }
  }

  /**
   * 👁️  Parse PIR/motion sensor data
   */
  parsePIRData(buffer) {
    if (buffer.length < 1) {
      return null;
    }

    try {
      // Format: [motion:1][illuminance:2?][sensitivity:1?]
      const motion = buffer.readUInt8(0) === 1;

      let illuminance = null;
      if (buffer.length >= 3) {
        illuminance = buffer.readUInt16BE(1);
      }

      let sensitivity = null;
      if (buffer.length >= 4) {
        sensitivity = buffer.readUInt8(3);
      }

      return {
        motion,
        illuminance,
        sensitivity
      };
    } catch (err) {
      this.device.log('[RAW_PARSER] Failed to parse PIR data:', err.message);
      return null;
    }
  }

  /**
   * ⚡ Parse energy monitoring data
   */
  parseEnergyData(buffer) {
    if (buffer.length < 8) {
      this.device.log('[RAW_PARSER] Energy data too short');
      return null;
    }

    try {
      // Format: [power:2][voltage:2][current:2][energy:2]
      const power = buffer.readUInt16BE(0) / 10; // Watts
      const voltage = buffer.readUInt16BE(2) / 10; // Volts
      const current = buffer.readUInt16BE(4) / 1000; // Amps
      const energy = buffer.readUInt16BE(6) / 100; // kWh

      return {
        power,
        voltage,
        current,
        energy
      };
    } catch (err) {
      this.device.log('[RAW_PARSER] Failed to parse energy data:', err.message);
      return null;
    }
  }

  /**
   * 🔄 Auto-detect and parse raw buffer
   */
  autoParseRaw(buffer) {
    this.device.log(`[RAW_PARSER] Auto-parsing buffer: ${buffer.toString('hex')}`);

    // Try different formats
    const results = {};

    // Try climate
    const climate = this.parseClimateData(buffer);
    if (climate && climate.temperature > -50 && climate.temperature < 100) {
      Object.assign(results, climate);
    }

    // Try soil
    const soil = this.parseSoilData(buffer);
    if (soil && soil.moisture >= 0 && soil.moisture <= 100) {
      results.soil = soil;
    }

    // Try PIR
    const pir = this.parsePIRData(buffer);
    if (pir) {
      results.pir = pir;
    }

    // Try energy
    const energy = this.parseEnergyData(buffer);
    if (energy && energy.power >= 0 && energy.power < 10000) {
      results.energy = energy;
    }

    return Object.keys(results).length > 0 ? results : null;
  }

  /**
   * 📊 Get human-readable DP description
   */
  getDPDescription(dp) {
    const mapping = this.COMMON_DPS[dp];
    return mapping ? mapping.name : `Unknown DP ${dp}`;
  }

  /**
   * 🔍 Discover available DPs on device
   */
  async discoverDPs(tuyaCluster) {
    this.device.log('[RAW_PARSER] 🔍 Discovering available DPs...');

    const discoveredDPs = [];

    // Try to read common DPs
    for (const dp of Object.keys(this.COMMON_DPS)) {
      try {
        // Request DP value
        // Note: Implementation depends on cluster API
        this.device.log(`[RAW_PARSER] Trying DP${dp}...`);
        // TODO: Implement DP read request

      } catch (err) {
        // DP not available
      }
    }

    this.device.log(`[RAW_PARSER] ✅ Discovered ${discoveredDPs.length} DPs`);

    return discoveredDPs;
  }
}

module.exports = RawDataParser;
