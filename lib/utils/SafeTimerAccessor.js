'use strict';

/**
 * SafeTimerAccessor — v9.0.253 (P62)
 *
 * Patches `ZigBeeDevice` (the root base class from homey-zigbeedriver) with
 * a `safeSetTimeout` method that survives the device being destroyed.
 *
 * Forum crash report (Gmail diagnostics 2026-07-15):
 *   - 45x "Cannot read properties of undefined (reading 'setTimeout')"
 *   - 44x "Cannot read properties of undefined (reading 'setTimeout')" (dup)
 *   - 24x "Cannot read properties of undefined (reading '_destroyed')"
 *   - 24x "Cannot read properties of undefined (reading '_destroyed')" (dup)
 *
 * Root cause: code calls `this.homey.setTimeout(fn, ms)` where
 * `this.homey` is undefined (after device destroy or in early init).
 * The 21 unguarded call sites in lib/ are a long-tail refactor; the
 * P58-style global install fixes all current AND future drivers in one shot.
 *
 * Patches:
 *  - `safeSetTimeout(fn, ms)` — never throws, never crashes
 *  - `safeClearTimeout(timer)` — never throws
 *  - `safeSetInterval(fn, ms)` — never throws
 *  - `safeClearInterval(timer)` — never throws
 *  - `isDestroyedSafe()` — never throws, returns true if destroyed
 *
 * Backed by `lib/utils/safe-timers.js`.
 *
 * Usage (auto-installed on app load — drivers just call `this.safeSetTimeout`):
 *   await new Promise(r => this.safeSetTimeout(r, 100));
 *   const t = this.safeSetTimeout(() => { ... }, 5000);
 *   this.safeClearTimeout(t);
 */

const {
  safeSetTimeout: _safeSetTimeout,
  safeClearTimeout: _safeClearTimeout,
  safeSetInterval: _safeSetInterval,
  safeClearInterval: _safeClearInterval,
  isDestroyed: _isDestroyed,
} = require('./safe-timers');

/**
 * Patch a base class prototype with safe timer methods. Idempotent.
 *
 * @param {Function} BaseClass
 * @returns {boolean} true if newly installed, false if already present
 */
function installSafeTimerAccessor(BaseClass) {
  if (!BaseClass || !BaseClass.prototype) return false;
  if (typeof BaseClass.prototype.safeSetTimeout === 'function') {
    return false; // already installed
  }
  BaseClass.prototype.safeSetTimeout = function (callback, delay) {
    return _safeSetTimeout(this, callback, delay);
  };
  BaseClass.prototype.safeClearTimeout = function (timer) {
    return _safeClearTimeout(this, timer);
  };
  BaseClass.prototype.safeSetInterval = function (callback, delay) {
    return _safeSetInterval(this, callback, delay);
  };
  BaseClass.prototype.safeClearInterval = function (timer) {
    return _safeClearInterval(this, timer);
  };
  BaseClass.prototype.isDestroyedSafe = function () {
    return _isDestroyed(this);
  };
  return true;
}

module.exports = {
  installSafeTimerAccessor,
};
