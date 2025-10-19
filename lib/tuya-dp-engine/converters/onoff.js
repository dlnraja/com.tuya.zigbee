'use strict';

/**
 * On/Off Converter
 * Handles boolean on/off states
 */

module.exports = {
  /**
   * Convert DP value to Homey capability value
   * @param {boolean} dpValue - Tuya DP value
   * @param {object} config - Capability configuration
   * @returns {boolean} - Homey value (true/false)
   */
  toHomey: (dpValue, config = {}) => {
    // Tuya uses true/false directly
    return Boolean(dpValue);
  },

  /**
   * Convert Homey capability value to DP value
   * @param {boolean} homeyValue - Homey value
   * @param {object} config - Capability configuration
   * @returns {boolean} - Tuya DP value
   */
  toDevice: (homeyValue, config = {}) => {
    // Convert to boolean
    return Boolean(homeyValue);
  },

  /**
   * Validate value
   * @param {*} value - Value to validate
   * @returns {boolean} - Is valid
   */
  validate: (value) => {
    return typeof value === 'boolean';
  }
};
