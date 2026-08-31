'use strict';

/**
 * P2306 / P2351 — Soft-fail ManagerDrivers.getDriver for foreign driver IDs.
 *
 * WHY: Homey flow serializer embeds tokens from other apps (e.g. Hue
 * `ZG9101SAC_HP`, `homey:virtualdriverzigbee:…`). SDK getDriver throws
 * "Invalid Driver ID" and kills the whole Universal Tuya process
 * (Gmail crashes on 9.0.730 / 9.0.743).
 *
 * HOW: wrap getDriver (+ _getDriverManifest when present) to return null
 * instead of throwing on unknown/foreign IDs.
 */

function shouldSoftFail(driverId, err) {
  const msg = String((err && err.message) || err || '');
  const id = String(driverId || '');
  return (
    /Invalid Driver ID/i.test(msg)
    || /virtualdriverzigbee/i.test(id)
    || /homey:virtual/i.test(id)
    // Hue / third-party Zigbee driver IDs seen in mixed-flow tokens
    || /^ZG\d/i.test(id)
    || /^LCT\d/i.test(id)
    || /^LLC\d/i.test(id)
  );
}

function installSafeGetDriver(target, logFn) {
  if (!target || typeof target.getDriver !== 'function') return false;
  if (target.__p2351SafeGetDriver) return true;

  const origGet = target.getDriver.bind(target);
  target.getDriver = function safeGetDriver(driverId) {
    try {
      return origGet(driverId);
    } catch (err) {
      if (shouldSoftFail(driverId, err)) {
        try {
          (logFn || this.error || this.log || console.error).call(
            this,
            `[P2351] getDriver soft-fail: ${driverId} (${err && err.message})`,
          );
        } catch (_) { /* noop */ }
        return null;
      }
      throw err;
    }
  };

  if (typeof target._getDriverManifest === 'function') {
    const origManifest = target._getDriverManifest.bind(target);
    target._getDriverManifest = function safeGetDriverManifest(driverId) {
      try {
        return origManifest(driverId);
      } catch (err) {
        if (shouldSoftFail(driverId, err)) {
          try {
            (logFn || this.error || this.log || console.error).call(
              this,
              `[P2351] _getDriverManifest soft-fail: ${driverId}`,
            );
          } catch (_) { /* noop */ }
          return null;
        }
        throw err;
      }
    };
  }

  target.__p2351SafeGetDriver = true;
  return true;
}

function installFromHomeyModule() {
  try {
    const Homey = require('homey');
    const proto = Homey?.ManagerDrivers?.prototype;
    if (proto) return installSafeGetDriver(proto);
  } catch (_) { /* best-effort */ }
  return false;
}

module.exports = {
  installSafeGetDriver,
  installFromHomeyModule,
  shouldSoftFail,
};
