'use strict';

/**
 * Illuminance Converter
 * 
 * Handles illuminance conversions:
 * - Zigbee: measuredValue in log-lux format
 * - Homey: lux (linear scale)
 * - Tuya DP: Usually lux directly
 */

/**
 * Convert from Zigbee log-lux to lux
 * Zigbee spec: lux = 10 ^ ((measuredValue - 1) / 10000)
 * @param {number} measuredValue - Zigbee measuredValue
 * @returns {number} - Lux value
 */
function fromZigbeeMeasuredValue(measuredValue) {
  if (measuredValue == null || isNaN(measuredValue)) return null;
  
  // Handle special values
  if (measuredValue === 0 || measuredValue === 0xFFFF) return 0;
  
  // Convert from log-lux to lux
  // Formula: lux = 10^((measuredValue - 1) / 10000)
  const lux = Math.pow(10, (measuredValue - 1) / 10000);
  
  // Clamp to reasonable range (0..100,000 lux)
  return Math.round(Math.max(0, Math.min(100000, lux)));
}

/**
 * Convert from lux to Zigbee log-lux
 * @param {number} lux - Lux value
 * @returns {number} - Zigbee measuredValue
 */
function toZigbeeMeasuredValue(lux) {
  if (lux == null || isNaN(lux) || lux <= 0) return 0;
  
  // Formula: measuredValue = 10000 * log10(lux) + 1
  const measuredValue = Math.round(10000 * Math.log10(lux) + 1);
  
  return Math.max(0, Math.min(0xFFFE, measuredValue));
}

/**
 * Convert from Tuya DP illuminance to Homey lux
 * Tuya usually reports lux directly, but may use different scales
 * @param {number} value - Tuya DP value
 * @param {Object} options - Conversion options
 * @param {number} options.scale - Scale factor (default: 1)
 * @param {boolean} options.isLogLux - If true, treat as log-lux (default: false)
 * @returns {number} - Lux value
 */
function fromDP(value, { scale = 1, isLogLux = false } = {}) {
  if (value == null || isNaN(value)) return null;
  
  if (isLogLux) {
    return fromZigbeeMeasuredValue(value);
  }
  
  // Direct lux value with optional scaling
  const lux = value * scale;
  return Math.round(Math.max(0, Math.min(100000, lux)));
}

/**
 * Convert from Homey lux to Tuya DP
 * @param {number} lux - Lux value
 * @param {Object} options - Conversion options
 * @param {number} options.scale - Scale factor (default: 1)
 * @returns {number} - Tuya DP value
 */
function toDP(lux, { scale = 1 } = {}) {
  if (lux == null || isNaN(lux)) return 0;
  
  const value = lux / scale;
  return Math.round(Math.max(0, value));
}

module.exports = {
  fromDP,
  toDP,
  fromZigbeeMeasuredValue,
  toZigbeeMeasuredValue
};
