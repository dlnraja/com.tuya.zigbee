'use strict';

/**
 * SmartValueProcessor - Intelligent value processing for all sensor types
 * Handles dividers, multipliers, calibration, defective sensor detection
 * and capability auto-adaptation
 */

class SmartValueProcessor {
  constructor() {
    // Known DP type configurations per manufacturer
    this.dpConfigs = {
      // Temperature DPs
      temperature: {
        min: -40, max: 100, unit: '°C',
        commonDividers: [1, 10, 100],
        calibrationRange: { min: -2, max: 2 }
      },
      humidity: {
        min: 0, max: 100, unit: '%',
        commonDividers: [1, 10],
        calibrationRange: { min: -5, max: 5 }
      },
      battery: {
        min: 0, max: 100, unit: '%',
        commonDividers: [1, 10],
        calibrationRange: { min: 0, max: 0 }
      },
      power: {
        min: 0, max: 100000, unit: 'W',
        commonDividers: [1, 10, 100, 1000],
        calibrationRange: { min: 0, max: 0 }
      },
      voltage: {
        min: 0, max: 500, unit: 'V',
        commonDividers: [1, 10],
        calibrationRange: { min: 0, max: 0 }
      },
      current: {
        min: 0, max: 100, unit: 'A',
        commonDividers: [1, 100, 1000],
        calibrationRange: { min: 0, max: 0 }
      },
      pm25: {
        min: 0, max: 1000, unit: 'µg/m³',
        commonDividers: [1],
        calibrationRange: { min: 0, max: 0 }
      },
      co2: {
        min: 0, max: 5000, unit: 'ppm',
        commonDividers: [1],
        calibrationRange: { min: 0, max: 0 }
      },
      illuminance: {
        min: 0, max: 100000, unit: 'lux',
        commonDividers: [1, 10],
        calibrationRange: { min: 0, max: 0 }
      },
      distance: {
        min: 0, max: 10000, unit: 'cm',
        commonDividers: [1, 10, 100],
        calibrationRange: { min: 0, max: 0 }
      }
    };

    // Track value history per device for stuck detection
    this.valueHistory = new Map();
    this.STUCK_THRESHOLD = 20; // Number of identical readings to flag as stuck
    this.DEFECTIVE_TIMEOUT = 3600000; // 1 hour of no data = potentially defective
  }

  /**
   * Process a raw value with smart divider/multiplier detection
   */
  processValue(rawValue, dpType, options = {}) {
    if (rawValue === null || rawValue === undefined) return null;

    const config = this.dpConfigs[dpType];
    if (!config) return rawValue;

    let value = rawValue;

    // Apply divider if specified
    if (options.divider && options.divider > 0) {
      value = value / options.divider;
    }

    // Apply multiplier if specified
    if (options.multiplier && options.multiplier > 0) {
      value = value * options.multiplier;
    }

    // Auto-detect if value is out of expected range
    if (config && (value < config.min || value > config.max)) {
      // Try common dividers
      for (const div of config.commonDividers) {
        const adjusted = value / div;
        if (adjusted >= config.min && adjusted <= config.max) {
          value = adjusted;
          break;
        }
      }
    }

    // Apply calibration offset
    if (options.calibration && config.calibrationRange) {
      const offset = Math.max(config.calibrationRange.min,
        Math.min(config.calibrationRange.max, options.calibration));
      value += offset;
    }

    // Round to reasonable precision
    if (dpType === 'temperature') value = Math.round(value * 10) / 10;
    else if (dpType === 'humidity') value = Math.round(value);
    else if (dpType === 'power' || dpType === 'voltage') value = Math.round(value * 100) / 100;

    return value;
  }

  /**
   * Detect if a sensor is stuck (same value repeated)
   */
  isStuck(deviceId, value) {
    if (!this.valueHistory.has(deviceId)) {
      this.valueHistory.set(deviceId, { values: [], lastUpdate: Date.now() });
    }

    const history = this.valueHistory.get(deviceId);
    history.values.push(value);
    history.lastUpdate = Date.now();

    // Keep only last N values
    if (history.values.length > this.STUCK_THRESHOLD) {
      history.values.shift();
    }

    // Check if all recent values are identical
    if (history.values.length >= this.STUCK_THRESHOLD) {
      const allSame = history.values.every(v => v === value);
      if (allSame) return true;
    }

    return false;
  }

  /**
   * Detect if a sensor is defective (no data for too long)
   */
  isDefective(deviceId) {
    if (!this.valueHistory.has(deviceId)) return false;
    const history = this.valueHistory.get(deviceId);
    return (Date.now() - history.lastUpdate) > this.DEFECTIVE_TIMEOUT;
  }

  /**
   * Detect if a value is NaN or invalid
   */
  isInvalid(value) {
    return value === null || value === undefined || isNaN(value) || !isFinite(value);
  }

  /**
   * Auto-detect the best divider for a raw value
   */
  autoDetectDivider(rawValue, dpType) {
    const config = this.dpConfigs[dpType];
    if (!config) return 1;

    for (const div of config.commonDividers) {
      const adjusted = rawValue / div;
      if (adjusted >= config.min && adjusted <= config.max) {
        return div;
      }
    }
    return 1;
  }

  /**
   * Parse bitmap values
   */
  parseBitmap(value, bitDefinitions) {
    const result = {};
    for (const [name, bit] of Object.entries(bitDefinitions)) {
      result[name] = Boolean(value & (1 << bit));
    }
    return result;
  }

  /**
   * Map enum value to string
   */
  mapEnum(value, enumMap) {
    return enumMap[value] || `unknown_${value}`;
  }

  /**
   * Handle signed vs unsigned integers
   */
  handleSignedness(value, bits = 32) {
    const max = Math.pow(2, bits - 1);
    if (value >= max) {
      return value - Math.pow(2, bits);
    }
    return value;
  }
}

module.exports = SmartValueProcessor;