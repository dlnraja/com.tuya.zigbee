'use strict';

/**
 * SafeCapability — v9.0.240 (P58)
 *
 * Standalone safe-capability helpers. Most code should use the
 * `SafeCapabilityMixin` so `this.safeSetCapabilityValue(...)` is available on
 * every device; this module exposes the same logic for callers that only have
 * a reference to a device instance and want a function form.
 *
 * Exports:
 *  - safeSetCapabilityValue(device, capability, value)  → boolean (async)
 *  - installSafeCapabilityMixin(BaseClass)              → patch prototype
 */

const SafeCapabilityMixin = require('../mixins/SafeCapabilityMixin');

/**
 * Standalone safe setter — never throws.
 *
 * @param {Device} device Homey device instance
 * @param {string} capability Capability ID
 * @param {*} value Value to set
 * @returns {Promise<boolean>} true on success
 */
async function safeSetCapabilityValue(device, capability, value) {
  if (!device) return false;
  if (typeof device.safeSetCapabilityValue === 'function') {
    return device.safeSetCapabilityValue(capability, value);
  }
  // Fallback: install the mixin method on the fly, then call it
  try {
    device.safeSetCapabilityValue = SafeCapabilityMixin.safeSetCapabilityValue;
    return device.safeSetCapabilityValue(capability, value);
  } catch (_err) {
    return false;
  }
}

/**
 * Patch a base class prototype with the safe capability mixin. Idempotent.
 *
 * @param {Function} BaseClass
 */
function installSafeCapabilityMixin(BaseClass) {
  if (!BaseClass || !BaseClass.prototype) return false;
  if (typeof BaseClass.prototype.safeSetCapabilityValue === 'function') {
    return false; // already installed
  }
  Object.assign(BaseClass.prototype, SafeCapabilityMixin);
  return true;
}

module.exports = {
  safeSetCapabilityValue,
  installSafeCapabilityMixin,
  SafeCapabilityMixin,
};
