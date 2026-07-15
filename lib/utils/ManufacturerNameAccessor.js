'use strict';

/**
 * ManufacturerNameAccessor — v9.0.249 (P59)
 *
 * Patches `ZigBeeDevice` (the root base class from homey-zigbeedriver) with
 * a `getManufacturerName()` method so every driver can use
 * `this.getManufacturerName()` without each driver having to import
 * `ManufacturerNameHelper` separately.
 *
 * This eliminates a class of crash bugs where drivers wrote
 * `this.getManufacturerName()` but no such method existed on the base class
 * (only `_getManufacturerName()` and the standalone `MfrHelper.getManufacturerName(device)`).
 *
 * Forum reference (topic 140352):
 *   - post #2044: "this.getManufacturerName is not a function"  (presence radar)
 *   - post #2045: dlnraja v8.1.5 fixed the same regression
 *   - post #2033 / #2046: multiple users reporting presence-sensor crashes
 *
 * Exports:
 *  - getManufacturerName(device) → string (sync; never throws)
 *  - installManufacturerNameAccessor(BaseClass) → patch prototype
 *  - withManufacturerName(device, fn) → call fn(mfr) safely
 */

const MfrHelper = require('../helpers/ManufacturerNameHelper');

/**
 * Standalone safe getter. Returns the manufacturer name as a string
 * (possibly empty if all sources fail). Never throws.
 *
 * @param {Device} device Homey device instance
 * @returns {string} manufacturer name or '' if not available
 */
function getManufacturerName(device) {
  if (!device) return '';
  // Delegate to the established helper so the fallback chain stays in one place.
  try {
    return MfrHelper.getManufacturerName(device) || '';
  } catch (_err) {
    return '';
  }
}

/**
 * Patch a base class prototype with the getManufacturerName method.
 * Idempotent: re-installing is a no-op.
 *
 * @param {Function} BaseClass
 * @returns {boolean} true if newly installed, false if already present
 */
function installManufacturerNameAccessor(BaseClass) {
  if (!BaseClass || !BaseClass.prototype) return false;
  if (typeof BaseClass.prototype.getManufacturerName === 'function') {
    return false; // already installed
  }
  BaseClass.prototype.getManufacturerName = function () {
    return getManufacturerName(this);
  };
  return true;
}

module.exports = {
  getManufacturerName,
  installManufacturerNameAccessor,
};
