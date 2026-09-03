'use strict';

/**
 * SafeCapabilityMixin — v9.0.240
 *
 * Adds `safeSetCapabilityValue(capability, value)` to every device.
 *
 * This method is the universally-safe equivalent of `setCapabilityValue`:
 *  - Returns false (no throw) if the device is destroyed/removed
 *  - Returns false if the capability does not exist on the device
 *  - Returns false if the value is undefined / NaN
 *  - Logs but never throws
 *  - Catches promise rejection silently (the existing pattern in 9+ files)
 *
 * Why this exists (P58):
 *  - The 9+ files in `lib/` that call `device.safeSetCapabilityValue` assume
 *    the method exists; the original `setCapabilityValue` would throw if the
 *    device is destroyed, but the safe variant does not.
 *  - The P57 audit flagged 11 drivers as `direct-setcapabilityvalue` because
 *    they override `setCapabilityValue` without first checking `this.destroyed`.
 *    This mixin gives those drivers a non-throwing alternative to call.
 *
 * Usage (preferred):
 *
 *   class MyDevice extends UniversalZigbeeDevice {
 *     async setCapabilityValue(capability, value) {
 *       if (this.destroyed) return;
 *       // ... custom logic ...
 *       await this.safeSetCapabilityValue(capability, finalValue);
 *     }
 *   }
 *
 * External callers (lib/, mixins/, helpers/):
 *
 *   const setter = typeof device.safeSetCapabilityValue === 'function'
 *     ? device.safeSetCapabilityValue.bind(device)
 *     : device.setCapabilityValue?.bind(device);
 *   await setter?.('measure_battery', 72).catch(() => {});
 *
 * Mixin application:
 *
 *   const SafeCapabilityMixin = require('./mixins/SafeCapabilityMixin');
 *   Object.assign(UniversalZigbeeDevice.prototype, SafeCapabilityMixin);
 *
 * No-state, no-deps, pure prototype patch. Safe to apply to all base classes.
 */

const SafeCapabilityMixin = {

  /**
   * Set a capability value safely — never throws, never touches a destroyed
   * device, and never sets undefined/NaN values.
   *
   * @param {string} capability Capability ID
   * @param {*} value Value to set
   * @returns {Promise<boolean>} true on success, false on any skip condition
   */
  async safeSetCapabilityValue(capability, value) {
    try {
      // 1) Destroyed / removed
      if (this.destroyed || this._destroyed) {
        return false;
      }
      // 2) Capability doesn't exist
      if (typeof this.hasCapability === 'function' && !this.hasCapability(capability)) {
        return false;
      }
      // 3) Undefined / NaN values are not useful
      if (value === undefined || (typeof value === 'number' && Number.isNaN(value))) {
        return false;
      }
      // 3b) v9.0.412 (P92.116): idempotency — skip writes with an unchanged value.
      // Every redundant setCapabilityValue fires Homey's built-in capability-
      // changed triggers; at init/app-update time that made users' flows fire
      // spuriously (Cam #1948: "my smart switch fires every app update").
      if (typeof this.getCapabilityValue === 'function' && this.getCapabilityValue(capability) === value) {
        return true;
      }
      // 4) Write via setCapabilityValue with recursion depth guard.
      // WHY(P2308): some bases map set→safeSet; depth>0 = re-entry → abort (no RangeError).
      // WHY(P2413 / Nightly P58): never require('homey') here — on CI/dev that package is
      // often the Homey CLI (no Device) and requiring it dumps help / can abort the process.
      // Unit tests + non-SDK hosts use the instance setter; Homey Pro uses Device via
      // the normal inheritance chain when drivers call setCapabilityValue → SDK.
      if (this.__safeCapDepth) return false;
      if (typeof this.setCapabilityValue !== 'function') return false;
      this.__safeCapDepth = 1;
      try {
        await this.setCapabilityValue(capability, value);
      } finally {
        delete this.__safeCapDepth;
      }
      return true;
    } catch (_err) {
      // Never throw — best-effort capability write.
      return false;
    }
  },
};

module.exports = SafeCapabilityMixin;
