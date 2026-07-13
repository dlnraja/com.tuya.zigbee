// lib/utils/safe-timers.js — defensive setTimeout helpers
'use strict';

/**
 * Safe setTimeout that survives homey destroyed state.
 * 
 * The 67x crash pattern (43 setTimeout + 24 _destroyed) comes from
 * `this.homey.setTimeout(...)` being called when `this.homey` is undefined
 * after device destruction.
 *
 * Usage:
 *   const t = safeSetTimeout(this, () => doSomething(), 1000);
 *   if (t && typeof t.unref === 'function') t.unref();
 */
function safeSetTimeout(target, callback, delay) {
  // target can be 'this' (the device) or a homey object
  const homey = target?.homey || target;
  if (homey && typeof homey.setTimeout === 'function') {
    try {
      return homey.setTimeout(callback, delay);
    } catch (e) {
      // Fall through to global setTimeout
    }
  }
  // Fallback to global setTimeout - still works after device destroy
  if (typeof globalThis.setTimeout === 'function') {
    return globalThis.setTimeout(callback, delay);
  }
  // Last resort - no-op
  return null;
}

/**
 * Safe clearTimeout that survives homey destroyed state.
 */
function safeClearTimeout(target, timer) {
  if (!timer) return;
  const homey = target?.homey || target;
  if (homey && typeof homey.clearTimeout === 'function') {
    try {
      homey.clearTimeout(timer);
      return;
    } catch (e) {
      // Fall through
    }
  }
  if (typeof globalThis.clearTimeout === 'function') {
    try { globalThis.clearTimeout(timer); } catch (e) { /* noop */ }
  }
}

/**
 * Check if a target is destroyed or being destroyed.
 */
function isDestroyed(target) {
  if (!target) return true;
  if (target._destroyed) return true;
  if (target.homey?.isDestroyed) return true;
  return false;
}

module.exports = { safeSetTimeout, safeClearTimeout, isDestroyed };
