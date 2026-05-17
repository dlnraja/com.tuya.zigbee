'use strict';

const TuyaDataPointsZ2M = require('./TuyaDataPointsZ2M');
const TuyaSensorDatabase = require('./TuyaSensorDatabase');

/**
 * TuyaUniversalMapper - v9.0.0
 * The ultimate "Universal Translator" for Tuya Zigbee devices.
 * Bridges raw DPs to Homey capabilities using a tiered strategy:
 * 1. Explicit Manufacturer-specific mappings (L14 Hardened)
 * 2. Z2M-based Category mappings
 * 3. Intelligent Heuristic Discovery (v8.1.0)
 * 4. Universal Bridge Fallback
 */
class TuyaUniversalMapper {
  constructor(device) {
    this.device = device;
    this.mfr = (device.getSettings().zb_manufacturer_name || '').toLowerCase();
    this.modelId = (device.getSettings().zb_model_id || '').toLowerCase();
    
    // Load manufacturer-specific config from database
    this.sensorConfig = TuyaSensorDatabase.getSensorConfig(this.mfr, this.modelId);
    
    // Standard Z2M converters
    this.converters = TuyaDataPointsZ2M.valueConverter;
  }

  /**
   * Get capability mapping for a DP
   * @param {number} dp - DP ID
   * @param {any} value - Raw value
   * @returns {Object|null} { capability, value, converter }
   */
  mapDP(dp, value) {
    // 1. Check for explicit manufacturer-specific overrides from database
    const dbMap = this.sensorConfig?.dpMap?.[dp];
    if (dbMap) return this._applyMapping(dbMap, value);

    // 2. Check for explicit manufacturer-specific overrides (hardcoded logic)
    const override = this._getManufacturerOverride(dp);
    if (override) return this._applyMapping(override, value);

    // 3. Check Z2M Category-based registry
    const z2mMap = this._getZ2MMapping(dp);
    if (z2mMap) return this._applyMapping(z2mMap, value);

    // 4. Fallback to heuristics (if device has it)
    if (this.device.dpAutoDiscovery) {
      const heuristic = this.device.dpAutoDiscovery.applyDiscoveredValue(dp, value);
      if (heuristic) return heuristic;
    }

    return null;
  }

  /**
   * Apply mapping and convert value
   */
  _applyMapping(map, rawValue) {
    let value = rawValue;
    if (map.converter && typeof map.converter.from === 'function') {
      value = map.converter.from(rawValue);
    } else if (map.divisor) {
      value = rawValue / map.divisor;
    }

    return {
      capability: map.cap,
      value: value,
      type: map.type || 'standard'
    };
  }

  /**
   * Registry of common DPs from Z2M
   */
  _getZ2MMapping(dp) {
    const COMMON_DPS = {
      1: { cap: 'onoff', type: 'bool', converter: this.converters.onOff },
      2: { cap: 'mode', type: 'enum' },
      3: { cap: 'dim', type: 'value', divisor: 10 },
      4: { cap: 'measure_battery', type: 'value', cap_alt: 'alarm_battery' },
      5: { cap: 'alarm_volume', type: 'enum', converter: this.converters.alarmVolume },
      7: { cap: 'child_lock', type: 'bool' },
      10: { cap: 'onoff.gang2', type: 'bool', converter: this.converters.onOff },
      11: { cap: 'onoff.gang3', type: 'bool', converter: this.converters.onOff },
      12: { cap: 'onoff.gang4', type: 'bool', converter: this.converters.onOff },
      14: { cap: 'measure_battery', type: 'value' },
      15: { cap: 'alarm_battery', type: 'bool' },
      17: { cap: 'measure_power', type: 'value', divisor: 10 },
      18: { cap: 'measure_current', type: 'value', divisor: 1000 },
      19: { cap: 'measure_voltage', type: 'value', divisor: 10 },
      20: { cap: 'meter_power', type: 'value', divisor: 100 },
      101: { cap: 'countdown', type: 'value' },
      102: { cap: 'measure_luminance', type: 'value' },
      103: { cap: 'alarm_contact', type: 'bool' },
      104: { cap: 'alarm_motion', type: 'bool' },
      105: { cap: 'measure_temperature', type: 'value', divisor: 10 },
      106: { cap: 'measure_humidity', type: 'value', divisor: 10 },
      121: { cap: 'measure_battery', type: 'value' }
    };

    return COMMON_DPS[dp] || null;
  }

  /**
   * Manufacturer-specific quirks (The "Black List" of weird DPs)
   */
  _getManufacturerOverride(dp) {
    // LIDL Silvercrest Smarter Home
    if (this.mfr.includes('lidl') || this.mfr.includes('_tz3000_')) {
      if (dp === 101) return { cap: 'onoff', converter: this.converters.onOff };
    }

    // Bseed Switches
    if (this.mfr.includes('bseed')) {
      if (dp === 1) return { cap: 'onoff', type: 'bool' };
    }

    return null;
  }
}

module.exports = TuyaUniversalMapper;
