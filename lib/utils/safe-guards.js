'use strict';

/**
 * Safe Guards - Protection NPE
 */

function safeGetDeviceOverride(getDeviceOverrideFn, device) {
  try {
    if (!getDeviceOverrideFn || !device) return null;
    const override = getDeviceOverrideFn(device);
    if (typeof override === 'string') return override;
    if (override?.id) return override.id;
    return null;
  } catch (e) {
    console.error(`[SAFE-GUARD] Error: ${e.message}`);
    return null;
  }
}

function driverExists(homey, driverId) {
  try {
    const driver = homey.drivers.getDriver(driverId);
    return !!driver;
  } catch { return false; }
}

module.exports = { safeGetDeviceOverride, driverExists };
