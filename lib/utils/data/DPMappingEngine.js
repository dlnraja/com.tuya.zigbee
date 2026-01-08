'use strict';

const DataConverter = require('./DataConverter');
const TuyaProtocolParser = require('./TuyaProtocolParser');
const SemanticConverter = require('./SemanticConverter');

/**
 * DPMappingEngine - v5.5.397
 * Map Tuya DPs to Homey capabilities and vice versa
 * Handles: DP parsing, capability mapping, value transformation
 */

class DPMappingEngine {
  /**
   * Create a new DP Mapping Engine
   * @param {Object} mappings - DP to capability mappings
   */
  constructor(mappings = {}) {
    this.mappings = new Map();
    this.reverseMappings = new Map();

    // Load initial mappings
    for (const [dpId, config] of Object.entries(mappings)) {
      this.addMapping(Number(dpId), config);
    }
  }

  /**
   * Add a DP mapping
   * @param {number} dpId - DP ID
   * @param {Object} config - Mapping configuration
   */
  addMapping(dpId, config) {
    const mapping = {
      dpId,
      capability: config.capability || config.cap,
      conversion: config.conversion || config.conv,
      dpType: config.dpType || config.type || 2, // Default VALUE
      subCapability: config.subCapability || config.sub,
      valueMap: config.valueMap || config.map,
      invert: config.invert || false,
      scale: config.scale || 1,
      offset: config.offset || 0,
      min: config.min,
      max: config.max,
      writable: config.writable !== false,
      reportOnly: config.reportOnly || false,
      parser: config.parser, // Custom parser function
      formatter: config.formatter // Custom formatter function
    };

    this.mappings.set(dpId, mapping);

    // Create reverse mapping (capability -> dpId)
    if (mapping.capability) {
      const capKey = mapping.subCapability
        ? `${mapping.capability}.${mapping.subCapability}`
        : mapping.capability;
      this.reverseMappings.set(capKey, dpId);
    }
  }

  /**
   * Process a DP report and extract capability values
   * @param {any} data - Raw DP data
   * @returns {Object} - { capabilities: {cap: value}, unmapped: [] }
   */
  processReport(data) {
    const frame = TuyaProtocolParser.parseFrame(data);

    if (!frame.valid) {
      return { capabilities: {}, unmapped: [], error: frame.error };
    }

    const capabilities = {};
    const unmapped = [];

    for (const dp of frame.dps) {
      const mapping = this.mappings.get(dp.id);

      if (mapping) {
        const value = this._transformValue(dp.value, mapping, 'fromDevice');

        if (mapping.subCapability) {
          capabilities[`${mapping.capability}.${mapping.subCapability}`] = value;
        } else if (mapping.capability) {
          capabilities[mapping.capability] = value;
        }
      } else {
        unmapped.push({
          dpId: dp.id,
          type: dp.typeName,
          value: dp.value,
          hex: dp.hex
        });
      }
    }

    return { capabilities, unmapped, frame };
  }

  /**
   * Build DP command for setting a capability value
   * @param {string} capability - Capability name
   * @param {any} value - Value to set
   * @param {number} seqNum - Sequence number (optional)
   * @returns {Buffer|null} - DP frame buffer or null if not writable
   */
  buildCommand(capability, value, seqNum = 0) {
    const dpId = this.reverseMappings.get(capability);

    if (dpId === undefined) {
      // Try without sub-capability
      const baseCap = capability.split('.')[0];
      const foundDpId = this.reverseMappings.get(baseCap);
      if (foundDpId === undefined) return null;
    }

    const mapping = this.mappings.get(dpId);

    if (!mapping || mapping.reportOnly) {
      return null;
    }

    const rawValue = this._transformValue(value, mapping, 'toDevice');
    return TuyaProtocolParser.buildSetFrame(seqNum, dpId, mapping.dpType, rawValue);
  }

  /**
   * Transform value between device and Homey
   * @private
   */
  _transformValue(value, mapping, direction) {
    let result = value;

    // Apply custom parser/formatter
    if (direction === 'fromDevice' && mapping.parser) {
      return mapping.parser(value);
    }
    if (direction === 'toDevice' && mapping.formatter) {
      return mapping.formatter(value);
    }

    // Apply value map
    if (mapping.valueMap) {
      if (direction === 'fromDevice') {
        result = mapping.valueMap[value] ?? value;
      } else {
        // Reverse lookup
        for (const [k, v] of Object.entries(mapping.valueMap)) {
          if (v === value) {
            result = Number(k);
            break;
          }
        }
      }
      return result;
    }

    // Apply semantic conversion
    if (mapping.conversion) {
      if (direction === 'fromDevice') {
        const converted = SemanticConverter.convert(value, mapping.conversion);
        result = converted.value;
      } else {
        result = SemanticConverter.toRaw(value, mapping.conversion);
      }
    }

    // Apply scale and offset
    if (direction === 'fromDevice') {
      result = (result / mapping.scale) + mapping.offset;
    } else {
      result = (result - mapping.offset) * mapping.scale;
    }

    // Apply invert
    if (mapping.invert && typeof result === 'boolean') {
      result = !result;
    } else if (mapping.invert && typeof result === 'number') {
      result = mapping.max !== undefined ? mapping.max - result : 100 - result;
    }

    // Apply bounds
    if (typeof result === 'number') {
      if (mapping.min !== undefined) result = Math.max(mapping.min, result);
      if (mapping.max !== undefined) result = Math.min(mapping.max, result);
    }

    return result;
  }

  /**
   * Get mapping for a DP
   * @param {number} dpId - DP ID
   * @returns {Object|null} - Mapping config
   */
  getMapping(dpId) {
    return this.mappings.get(dpId) || null;
  }

  /**
   * Get DP ID for a capability
   * @param {string} capability - Capability name
   * @returns {number|null} - DP ID
   */
  getDPForCapability(capability) {
    return this.reverseMappings.get(capability) ?? null;
  }

  /**
   * Get all mapped capabilities
   * @returns {string[]} - Array of capability names
   */
  getMappedCapabilities() {
    return [...this.reverseMappings.keys()];
  }

  /**
   * Get all mapped DP IDs
   * @returns {number[]} - Array of DP IDs
   */
  getMappedDPs() {
    return [...this.mappings.keys()];
  }

  /**
   * Check if a DP is mapped
   * @param {number} dpId - DP ID
   * @returns {boolean}
   */
  hasDPMapping(dpId) {
    return this.mappings.has(dpId);
  }

  /**
   * Check if a capability is mapped
   * @param {string} capability - Capability name
   * @returns {boolean}
   */
  hasCapabilityMapping(capability) {
    return this.reverseMappings.has(capability);
  }

  /**
   * Export mappings as plain object
   * @returns {Object}
   */
  toJSON() {
    const result = {};
    for (const [dpId, mapping] of this.mappings) {
      result[dpId] = { ...mapping };
    }
    return result;
  }

  /**
   * Create from common device type presets
   * @param {string} deviceType - Device type name
   * @returns {DPMappingEngine}
   */
  static fromPreset(deviceType) {
    const presets = {
      'climate_sensor': {
        1: { capability: 'measure_temperature', conversion: 'temp_div10', dpType: 2 },
        2: { capability: 'measure_humidity', conversion: 'humidity', dpType: 2 },
        3: { capability: 'measure_battery', conversion: 'battery', dpType: 2 }
      },
      'motion_sensor': {
        1: { capability: 'alarm_motion', conversion: 'bool', dpType: 1 },
        2: { capability: 'measure_battery', conversion: 'battery', dpType: 2 },
        3: { capability: 'measure_luminance', conversion: 'lux', dpType: 2 }
      },
      'contact_sensor': {
        1: { capability: 'alarm_contact', conversion: 'bool', dpType: 1 },
        2: { capability: 'measure_battery', conversion: 'battery', dpType: 2 }
      },
      'plug': {
        1: { capability: 'onoff', conversion: 'bool', dpType: 1 },
        9: { capability: 'measure_power', conversion: 'power_div10', dpType: 2 },
        17: { capability: 'measure_voltage', conversion: 'voltage_div10', dpType: 2 },
        18: { capability: 'measure_current', conversion: 'current_div1000', dpType: 2 },
        19: { capability: 'meter_power', conversion: 'energy_div100', dpType: 2 }
      },
      'dimmer': {
        1: { capability: 'onoff', conversion: 'bool', dpType: 1 },
        2: { capability: 'dim', conversion: 'dim', dpType: 2, min: 0, max: 100 }
      },
      'curtain': {
        1: { capability: 'windowcoverings_state', dpType: 4, valueMap: { 0: 'open', 1: 'stop', 2: 'close' } },
        2: { capability: 'windowcoverings_set', conversion: 'percent_invert', dpType: 2 }
      },
      'thermostat': {
        1: { capability: 'onoff', conversion: 'bool', dpType: 1 },
        2: { capability: 'target_temperature', conversion: 'temp_div10', dpType: 2 },
        3: { capability: 'measure_temperature', conversion: 'temp_div10', dpType: 2 }
      },
      'smoke_detector': {
        1: { capability: 'alarm_smoke', conversion: 'bool', dpType: 1 },
        4: { capability: 'measure_battery', conversion: 'battery', dpType: 2 }
      },
      'water_detector': {
        1: { capability: 'alarm_water', conversion: 'bool', dpType: 1 },
        4: { capability: 'measure_battery', conversion: 'battery', dpType: 2 }
      },
      'presence_sensor': {
        1: { capability: 'alarm_motion', conversion: 'bool', dpType: 4 },
        2: { capability: 'measure_luminance', conversion: 'lux', dpType: 2 },
        9: { capability: 'measure_distance', conversion: 'distance_cm', dpType: 2, reportOnly: true }
      }
    };

    const preset = presets[deviceType];
    return preset ? new DPMappingEngine(preset) : new DPMappingEngine();
  }

  /**
   * Merge another mapping engine
   * @param {DPMappingEngine} other - Other engine to merge
   */
  merge(other) {
    for (const [dpId, mapping] of other.mappings) {
      if (!this.mappings.has(dpId)) {
        this.addMapping(dpId, mapping);
      }
    }
  }

  /**
   * Clone this engine
   * @returns {DPMappingEngine}
   */
  clone() {
    return new DPMappingEngine(this.toJSON());
  }
}

module.exports = DPMappingEngine;
