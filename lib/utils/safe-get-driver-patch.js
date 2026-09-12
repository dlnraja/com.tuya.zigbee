'use strict';

/**
 * P2306 / P2351 / P2373 / P2480 / P2481 / P2482 — Soft-fail ManagerDrivers.getDriver for foreign driver IDs.
 *
 * WHY: Homey flow serializer embeds tokens from other apps / classes:
 *   - Hue `ZG9101SAC_HP` (Gmail crash 9.0.730 / 9.0.743)
 *   - `homey:virtualdriverzigbee:driver` (9.0.677)
 *   - Homey device **class** names as driver IDs: `light` (Gmail crash 9.0.746),
 *     `motionsensor` (Gmail crash 9.0.891 / 9.0.895 Homey Pro 2026 → process kill)
 *
 * HOW: wrap getDriver (+ _getDriverManifest) to return null instead of throw.
 * P2481: **preempt** known-bad IDs before calling Homey (Gmail 9.0.891 still threw
 * from inside safeGetDriver when only catch-path soft-fail was active; 9.0.895
 * hit unpatched _getDriverManifest → Invalid Driver ID).
 * P2482: never preempt **our own** driver folder IDs that collide with Homey class
 * names (`pirsensor`, `siren`, `doorbell`) — else legitimate getDriver soft-fails.
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
  'stove', 'bicycle', 'scooter', 'remote', 'camera', 'gamesconsole',
  'airpurifier', 'humidifier', 'diffuser', 'cooktop', 'oven', 'fridge',
  // WHY(P2480/P2481): Homey Pro 2026 serializer used legacy class as driver ID
  'motionsensor', 'lightsensor', 'smokedetector', 'smokealarm', 'co2sensor',
  'humiditysensor', 'temperaturesensor', 'watersensor', 'contactsensor',
  'vibrationsensor', 'pirsensor', 'airquality', 'motionsensorzigbee',
  'watersensor', 'leaksensor', 'doorsensor', 'windowsensor', 'occupancysensor',
]);

/** Lazy set of our driver folder IDs (lowercase). P2482 Contre quoi. */
let _ownDriverIds = null;

function getOwnDriverIds() {
  if (_ownDriverIds) return _ownDriverIds;
  _ownDriverIds = new Set();
  try {
    const fs = require('fs');
    const path = require('path');
    const driversDir = path.join(__dirname, '..', '..', 'drivers');
    for (const name of fs.readdirSync(driversDir)) {
      try {
        if (fs.statSync(path.join(driversDir, name)).isDirectory()) {
          _ownDriverIds.add(String(name).toLowerCase());
        }
      } catch (_) { /* skip */ }
    }
  } catch (_) {
    // Minimal fallback if drivers/ unreadable under Homey bundle edge cases
    ['pirsensor', 'siren', 'doorbell', 'plug', 'smartplug', 'fingerbot',
      'soilsensor', 'humidifier', 'doorwindowsensor'].forEach((id) => _ownDriverIds.add(id));
  }
  return _ownDriverIds;
}

function isForeignDriverId(driverId) {
  const id = String(driverId || '');
  const idLower = id.toLowerCase();
  // WHY(P2482): own driver IDs win over Homey class name collisions
  if (getOwnDriverIds().has(idLower)) return false;
  return (
    /virtualdriverzigbee/i.test(id)
    || /homey:virtual/i.test(id)
    || /homey:/i.test(id)
    || /^ZG\d/i.test(id)
    || /^LCT\d/i.test(id)
    || /^LLC\d/i.test(id)
    || /^SML\d/i.test(id)
    || HOMEY_DEVICE_CLASSES.has(idLower)
  );
}

function shouldSoftFail(driverId, err) {
  const msg = String((err && err.message) || err || '');
  return (
    // WHY(P2480): Homey throws BOTH forms during HomeySerializer.parse
    /Invalid Driver ID/i.test(msg)
    || /Driver Not Initialized/i.test(msg)
    || isForeignDriverId(driverId)
  );
}

function softLog(logFn, ctx, line) {
  try {
    (logFn || ctx?.error || ctx?.log || console.error).call(ctx, line);
  } catch (_) { /* noop */ }
}

function installSafeGetDriver(target, logFn, opts = {}) {
  if (!target || typeof target.getDriver !== 'function') return false;
  if (target.__p2351SafeGetDriver && !opts.force) return true;

  const origGet = (target.__p2351OrigGetDriver || target.getDriver).bind(target);
  target.__p2351OrigGetDriver = origGet;

  target.getDriver = function safeGetDriver(driverId) {
    // WHY(P2481): never call Homey for known-bad IDs — catch-path alone still
    // crashed Homey Pro 2026 when message form differed / patch race.
    if (isForeignDriverId(driverId)) {
      softLog(logFn, this, `[P2481] getDriver preempt soft-fail: ${driverId}`);
      return null;
    }
    try {
      return origGet(driverId);
    } catch (err) {
      if (shouldSoftFail(driverId, err)) {
        softLog(logFn, this, `[P2351/P2373] getDriver soft-fail: ${driverId} (${err && err.message})`);
        return null;
      }
      throw err;
    }
  };

  if (typeof target._getDriverManifest === 'function') {
    const origManifest = (target.__p2351OrigManifest || target._getDriverManifest).bind(target);
    target.__p2351OrigManifest = origManifest;
    target._getDriverManifest = function safeGetDriverManifest(driverId) {
      if (isForeignDriverId(driverId)) {
        softLog(logFn, this, `[P2481] _getDriverManifest preempt soft-fail: ${driverId}`);
        return null;
      }
      try {
        return origManifest(driverId);
      } catch (err) {
        if (shouldSoftFail(driverId, err)) {
          softLog(logFn, this, `[P2351/P2373] _getDriverManifest soft-fail: ${driverId}`);
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
  isForeignDriverId,
  getOwnDriverIds,
  HOMEY_DEVICE_CLASSES,
};
