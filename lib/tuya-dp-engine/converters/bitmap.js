'use strict';

/**
 * Bitmap Converter for Tuya DP Engine
 * Handles Tuya bitmap values where bits represent different states
 */

module.exports = {
  /**
   * Convert Tuya bitmap to Homey value
   * @param {number} dpValue - Raw bitmap value from device
   * @param {Object} config - DP mapping configuration
   * @param {number} config.bit - Bit index to extract (0-indexed)
   * @param {boolean} config.inverted - Whether to invert the result
   * @returns {boolean} Homey boolean value
   */
  toHomey: (dpValue, config) => {
    const bit = config.bit || 0;
    const value = (dpValue & (1 << bit)) !== 0;
    
    return config.inverted ? !value : value;
  },

  /**
   * Convert Homey boolean to Tuya bitmap
   * Note: This usually requires knowing the current bitmap value to avoid overwriting other bits.
   * If the device supports partial updates, we just return the bitmask.
   * @param {boolean} homeyValue - Value from Homey capability
   * @param {Object} config - DP mapping configuration
   * @param {number} config.bit - Bit index to set
   * @param {boolean} config.inverted - Whether to invert the value
   * @returns {number} Bitmask or value for device
   */
  toDevice: (homeyValue, config) => {
    const bit = config.bit || 0;
    const value = config.inverted ? !homeyValue : homeyValue;
    
    return value ? (1 << bit) : 0;
  }
};
