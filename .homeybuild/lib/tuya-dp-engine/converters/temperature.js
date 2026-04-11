'use strict';

/**
 * Temperature Converter
 * Handles temperature measurements in Celsius
 */

module.exports = {
  /**
   * Convert DP value to Homey capability value
   * @param {number} dpValue - Tuya DP value (temp * 10)
   * @param {object} config - Capability configuration
   * @returns {number} - Temperature in Celsius
   */
  toHomey: (dpValue, config = {}) => {
    // Tuya typically sends temperature * 10 (e.g., 235 = 23.5°C)
    const scale = config.scale || 10;
    const temp = dpValue / scale;
    
    // Apply offset if configured (for calibration)
    const offset = config.offset || 0;
    return temp + offset;
  },

  /**
   * Convert Homey capability value to DP value
   * @param {number} homeyValue - Temperature in Celsius
   * @param {object} config - Capability configuration
   * @returns {number} - Tuya DP value
   */
  toDevice: (homeyValue, config = {}) => {
    const scale = config.scale || 10;
    const offset = config.offset || 0;
    
    // Remove offset before scaling
    const temp = homeyValue - offset;
    return Math.round(temp * scale);
  },

  /**
   * Validate value
   * @param {*} value - Value to validate
   * @returns {boolean} - Is valid
   */
  validate: (value, config = {}) => {
    const min = config.min || -273.15; // Absolute zero
    const max = config.max || 200; // Reasonable max
    return typeof value === 'number' && value >= min && value <= max;
  }
};
