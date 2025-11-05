'use strict';

/**
 * Battery Converter - SDK3 Optimized
 *
 * Handles battery percentage conversions:
 * - Zigbee standard: 0..200 (0.5% resolution)
 * - Homey capability: 0..100 (1% resolution)
 * - Tuya DP: Usually 0..100 directly
 *
 * SDK3 BEST PRACTICES:
 * - Null/undefined safety (prevents crashes)
 * - NaN validation (prevents invalid values)
 * - Clamping to valid ranges (0-100%)
 *
 * USAGE IN DEVICE.JS:
 * ```javascript
 * const { fromZclBatteryPercentageRemaining } = require('./battery');
 *
 * this.registerCapability('measure_battery', 1, {
 *   get: 'batteryPercentageRemaining',
 *   report: 'batteryPercentageRemaining',
 *   reportParser: fromZclBatteryPercentageRemaining,
 *   getParser: fromZclBatteryPercentageRemaining
 * });
 * ```
 *
 * @version 3.1.5
 * @since 2.15.x
 */

/**
 * Convert from Zigbee batteryPercentageRemaining to Homey %
 * Zigbee spec: 0..200 = 0..100%
 * @param {number} raw - Raw Zigbee value (0..200)
 * @returns {number} - Battery percentage (0..100)
 */
function fromZclBatteryPercentageRemaining(raw) {
  if (raw == null || isNaN(raw)) return null;

  // Clamp to valid range (0..200)
  const clamped = Math.max(0, Math.min(200, raw));

  // Convert to 0..100 %
  const percentage = Math.round(clamped / 2);

  return Math.max(0, Math.min(100, percentage));
}

/**
 * Convert from Tuya DP battery value to Homey %
 * Tuya usually reports 0..100 directly
 * @param {number} value - Tuya DP value
 * @returns {number} - Battery percentage (0..100)
 */
function fromDP(value) {
  if (value == null || isNaN(value)) return null;

  // Tuya reports 0..100 directly
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Convert from Homey % to Tuya DP battery value
 * @param {number} value - Homey percentage (0..100)
 * @returns {number} - Tuya DP value
 */
function toDP(value) {
  if (value == null || isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Convert from Homey % to Zigbee batteryPercentageRemaining
 * @param {number} percentage - Homey percentage (0..100)
 * @returns {number} - Zigbee value (0..200)
 */
function toZclBatteryPercentageRemaining(percentage) {
  if (percentage == null || isNaN(percentage)) return 0;

  const clamped = Math.max(0, Math.min(100, percentage));
  return Math.round(clamped * 2);
}

module.exports = {
  fromDP,
  toDP,
  fromZclBatteryPercentageRemaining,
  toZclBatteryPercentageRemaining
};
