'use strict';

/**
 * Power Converter
 * Handles power measurement in watts
 */

module.exports = {
  /**
   * Convert DP value to Homey capability value
   * @param {number} dpValue - Tuya DP value (deciwatts)
   * @param {object} config - Capability configuration
   * @returns {number} - Power in watts
   */
  toHomey: (dpValue, config = {}) => {
    // Tuya typically sends power in deciwatts (W * 10)
    const scale = config.scale || 10;
    return dpValue / scale;
  },

  /**
   * Convert Homey capability value to DP value
   * @param {number} homeyValue - Power in watts
   * @param {object} config - Capability configuration
   * @returns {number} - Tuya DP value (deciwatts)
   */
  toDevice: (homeyValue, config = {}) => {
    const scale = config.scale || 10;
    return Math.round(homeyValue * scale);
  },

  /**
   * Validate value
   * @param {*} value - Value to validate
   * @returns {boolean} - Is valid
   */
  validate: (value) => {
    return typeof value === 'number' && value >= 0;
  }
};
