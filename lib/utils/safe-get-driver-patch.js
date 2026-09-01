'use strict';

/**
 * P2306 / P2351 / P2373 — Soft-fail ManagerDrivers.getDriver for foreign driver IDs.
 *
 * WHY: Homey flow serializer embeds tokens from other apps / classes:
 *   - Hue `ZG9101SAC_HP` (Gmail crash 9.0.730 / 9.0.743)
 *   - `homey:virtualdriverzigbee:driver` (9.0.677)
 *   - Homey device **class** names as driver IDs: `light` (Gmail crash 9.0.746,
 *     Homey 13.5.0-rc.4 → HomeySerializer → getDriver → process kill)
 *
 * HOW: wrap getDriver (+ _getDriverManifest) to return null instead of throw.
 * Install early after Homey require AND again on live this.homey.drivers in onInit.
 *
 * Track: BOTH (crash reliability).
 */

/** Homey SDK device classes sometimes leak into serializer as "driver IDs". */
const HOMEY_DEVICE_CLASSES = new Set([
  'light', 'socket', 'sensor', 'button', 'thermostat', 'lock', 'fan',
  'heater', 'kettle', 'coffeemachine', 'garagedoor', 'windowcoverings',
  'curtain', 'blinds', 'amplifier', 'tv', 'speaker', 'other', 'homealarm',
  'doorbell', 'sunshade', 'vacuumcleaner', 'dishwasher', 'washer', 'dryer',
]);

function shouldSoftFail(driverId, err) {
  const msg = String((err && err.message) || err || '');
  const id = String(driverId || '');
  const idLower = id.toLowerCase();
  return (
    /Invalid Driver ID/i.test(msg)
    || /virtualdriverzigbee/i.test(id)
    || /homey:virtual/i.test(id)
    || /homey:/i.test(id)
    // Hue / third-party Zigbee driver IDs seen in mixed-flow tokens
    || /^ZG\d/i.test(id)
    || /^LCT\d/i.test(id)
    || /^LLC\d/i.test(id)
    || /^SML\d/i.test(id)
    // WHY(P2373): Homey class name used as driver ID (email 2026-09-01 light)
    || HOMEY_DEVICE_CLASSES.has(idLower)
  );
}

function installSafeGetDriver(target, logFn, opts = {}) {
  if (!target || typeof target.getDriver !== 'function') return false;
  if (target.__p2351SafeGetDriver && !opts.force) return true;

  const origGet = (target.__p2351OrigGetDriver || target.getDriver).bind(target);
  target.__p2351OrigGetDriver = origGet;

  target.getDriver = function safeGetDriver(driverId) {
    try {
      return origGet(driverId);
    } catch (err) {
      if (shouldSoftFail(driverId, err)) {
        try {
          (logFn || this.error || this.log || console.error).call(
            this,
            `[P2351/P2373] getDriver soft-fail: ${driverId} (${err && err.message})`,
          );
        } catch (_) { /* noop */ }
        return null;
      }
      throw err;
    }
  };

  if (typeof target._getDriverManifest === 'function') {
    const origManifest = (target.__p2351OrigManifest || target._getDriverManifest).bind(target);
    target.__p2351OrigManifest = origManifest;
    target._getDriverManifest = function safeGetDriverManifest(driverId) {
      try {
        return origManifest(driverId);
      } catch (err) {
        if (shouldSoftFail(driverId, err)) {
          try {
            (logFn || this.error || this.log || console.error).call(
              this,
              `[P2351/P2373] _getDriverManifest soft-fail: ${driverId}`,
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
    const candidates = [
      Homey?.ManagerDrivers?.prototype,
      Homey?.managers?.drivers,
      Homey?.Driver?.prototype && Homey?.ManagerDrivers,
    ].filter(Boolean);
    let ok = false;
    for (const c of candidates) {
      if (installSafeGetDriver(c, null, { force: false })) ok = true;
    }
    return ok;
  } catch (_) { /* best-effort */ }
  return false;
}

module.exports = {
  installSafeGetDriver,
  installFromHomeyModule,
  shouldSoftFail,
  HOMEY_DEVICE_CLASSES,
};
