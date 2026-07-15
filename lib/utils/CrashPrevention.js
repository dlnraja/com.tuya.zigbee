'use strict';

/**
 * CrashPrevention — v9.0.260 (P63)
 *
 * Centralized "never-throw" wrappers for the most common device crash patterns
 * observed in Gmail diagnostics 2026-07-15:
 *
 *  - 7x "this._inferCapabilityFromValue is not a function" (UnifiedSensorBase)
 *  - 4x "this.safeSetCapabilityValue is not a function" (drivers not extending
 *    ZigBeeDevice, or extending intermediate classes)
 *  - 3x "Cannot access this.homey.app because the app instance has been
 *    destroyed" (callbacks firing after app teardown)
 *  - 2x "Invalid value for token X" (flow card token validation)
 *  - 89x "Cannot read properties of undefined (reading 'setTimeout')" (P62)
 *  - 48x "Cannot read properties of undefined (reading '_destroyed')" (P62)
 *
 * The P58-style global installs in app.js cover ZigBeeDevice.prototype and
 * its standard subclasses. This module provides the LAST-RESORT safety net
 * for cases where the prototype chain is broken (intermediate class, weird
 * inheritance, dynamic class extension) or where the homey reference is
 * already destroyed.
 *
 * All functions are pure helpers — no state, no deps. Safe to require
 * anywhere.
 */

const SAFE = Symbol.for('crash-prevention.safe');
const DESTROYED = new WeakSet();

/**
 * Mark an object as destroyed. Once marked, all safe* helpers will return
 * safe defaults instead of attempting the operation.
 *
 * @param {object} obj
 */
function markDestroyed(obj) {
  if (obj) DESTROYED.add(obj);
}

/**
 * Check if an object has been marked destroyed.
 *
 * @param {object} obj
 * @returns {boolean}
 */
function isDestroyed(obj) {
  if (!obj) return true;
  if (DESTROYED.has(obj)) return true;
  if (obj.destroyed) return true;
  if (obj._destroyed) return true;
  // Homey app destroyed
  if (obj.homey && obj.homey.isDestroyed) return true;
  return false;
}

/**
 * Safe call: only invoke `fn` if `this` is not destroyed. Catches throws
 * and returns `fallback` instead of propagating.
 *
 * @param {object} self
 * @param {Function} fn
 * @param {*} fallback
 * @param {...any} args
 * @returns {*}
 */
function safeCall(self, fn, fallback, ...args) {
  if (typeof fn !== 'function') return fallback;
  if (isDestroyed(self)) return fallback;
  try {
    return fn.apply(self, args);
  } catch (_err) {
    return fallback;
  }
}

/**
 * Safe async call: returns a Promise that always resolves to `fallback` on
 * any error or destroyed state. Never rejects.
 *
 * @param {object} self
 * @param {Function} fn
 * @param {*} fallback
 * @param {...any} args
 * @returns {Promise<*>}
 */
async function safeCallAsync(self, fn, fallback, ...args) {
  if (typeof fn !== 'function') return fallback;
  if (isDestroyed(self)) return fallback;
  try {
    const result = fn.apply(self, args);
    if (result && typeof result.catch === 'function') {
      return await result.catch(() => fallback);
    }
    return result;
  } catch (_err) {
    return fallback;
  }
}

/**
 * Safe capability value setter: a global fallback that wraps
 * safeSetCapabilityValue (P58) AND setCapabilityValue (legacy), and never
 * throws. Use this when you don't know if the device has the P58 mixin.
 *
 * @param {object} device
 * @param {string} capability
 * @param {*} value
 * @returns {Promise<boolean>} true on success, false otherwise
 */
async function safeSetCapabilityValue(device, capability, value) {
  if (!device || isDestroyed(device)) return false;
  if (typeof device.safeSetCapabilityValue === 'function') {
    try {
      return await device.safeSetCapabilityValue(capability, value);
    } catch (_err) {
      return false;
    }
  }
  if (typeof device.setCapabilityValue !== 'function') return false;
  try {
    if (typeof device.hasCapability === 'function' && !device.hasCapability(capability)) {
      return false;
    }
    if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
      return false;
    }
    await device.setCapabilityValue(capability, value);
    return true;
  } catch (_err) {
    return false;
  }
}

/**
 * Safe homey.app getter: returns the app or null if the homey instance is
 * destroyed. Use this everywhere you would write `this.homey.app`.
 *
 * @param {object} self Device instance with `.homey`
 * @returns {object|null}
 */
function safeGetApp(self) {
  if (!self) return null;
  let homey;
  try {
    homey = self.homey;
  } catch (_err) {
    return null;
  }
  if (!homey) return null;
  if (homey.isDestroyed) return null;
  try {
    return homey.app || null;
  } catch (_err) {
    return null;
  }
}

/**
 * Defensive call: only invoke a method if it exists. Returns `fallback`
 * otherwise. Catches any throw.
 *
 * @param {object} self
 * @param {string} method
 * @param {*} fallback
 * @param {...any} args
 * @returns {*}
 */
function safeInvoke(self, method, fallback, ...args) {
  if (!self) return fallback;
  if (typeof self[method] !== 'function') return fallback;
  return safeCall(self, self[method], fallback, ...args);
}

module.exports = {
  markDestroyed,
  isDestroyed,
  safeCall,
  safeCallAsync,
  safeSetCapabilityValue,
  safeGetApp,
  safeInvoke,
  SAFE,
};
