'use strict';

/**
 * Prefer device.safeSetCapabilityValue (L14) when available.
 * @param {object} device
 * @param {string} capability
 * @param {*} value
 */
async function safeSetDeviceCapability(device, capability, value) {
  if (!device || value === undefined) return;
  if (typeof device.hasCapability === 'function' && !device.hasCapability(capability)) return;
  try {
    if (typeof device.safeSetCapabilityValue === 'function') {
      await device.safeSetCapabilityValue(capability, value);
      return;
    }
    if (typeof device.setCapabilityValue === 'function') {
      await device.setCapabilityValue(capability, value);
    }
  } catch (_e) { /* non-critical */ }
}

module.exports = { safeSetDeviceCapability };
