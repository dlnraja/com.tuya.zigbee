'use strict';
// v9.0.40: Safe Logger - Replaces direct console.log fallbacks in lib/ utilities
// Provides a consistent interface that works with or without a device reference

/**
 * Create a safe logger that uses device.log/error if available, otherwise falls back silently
 * This replaces the pattern: device.log?.(msg) || console.log(msg)
 *
 * @param {object} [device] - Optional Homey device instance
 * @param {string} [prefix=''] - Log prefix for context
 * @returns {{ log: Function, error: Function, warn: Function }}
 */
function createSafeLogger(device, prefix = '') {
  const pre = prefix ? `[${prefix}] ` : '';

  return {
    log(msg, ...args) {
      if (device && typeof device.log === 'function') {
        device.log(`${pre}${msg}`, ...args);
      }
      // Silent fallback - no console.log in production
    },
    error(msg, ...args) {
      if (device && typeof device.error === 'function') {
        device.error(`${pre}${msg}`, ...args);
      }
      // Silent fallback - no console.error in production
    },
    warn(msg, ...args) {
      if (device && typeof device.warn === 'function') {
        device.warn(`${pre}${msg}`, ...args);
      }
      // Silent fallback - no console.warn in production
    },
  };
}

module.exports = { createSafeLogger };
