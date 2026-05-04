'use strict';

/**
 * Enum Converter for Tuya DP Engine
 * Maps Tuya enum values (0, 1, 2...) to Homey strings or values
 */

module.exports = {
  /**
   * Convert Tuya enum to Homey value
   * @param {number} dpValue - Raw enum value from device
   * @param {Object} config - DP mapping configuration
   * @param {Object} config.mapping - Map of { "0": "homey_value", "1": "homey_value" }
   * @returns {*} Homey capability value
   */
  toHomey: (dpValue, config) => {
    const mapping = config.mapping || {};
    // Check if mapping exists for this value
    if (mapping[dpValue] !== undefined) {
      return mapping[dpValue];
    }
    
    // Fallback to raw value if no mapping
    return dpValue;
  },

  /**
   * Convert Homey value to Tuya enum
   * @param {*} homeyValue - Value from Homey capability
   * @param {Object} config - DP mapping configuration
   * @param {Object} config.mapping - Map of { "0": "homey_value", "1": "homey_value" }
   * @returns {number} Raw enum value for device
   */
  toDevice: (homeyValue, config) => {
    const mapping = config.mapping || {};
    
    // Find key for this value
    const entry = Object.entries(mapping).find(([k, v]) => v === homeyValue);
    
    if (entry) {
      return parseInt(entry[0], 10);
    }
    
    // Fallback: try to return value as number if it is one
    if (typeof homeyValue === 'number') {
      return homeyValue;
    }
    
    return 0;
  }
};
