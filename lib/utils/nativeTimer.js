'use strict';

/**
 * P3068: the single gateway for NATIVE timers in lib/.
 *
 * Device / app code must use this.homey.setTimeout / setInterval (cleared on destroy).
 * The only legitimate native timers are fallbacks for code that has no Homey instance
 * (unit tests, module-level helpers, scripts). They all go through here so there is exactly
 * one audited place that touches the global timer API (memory-hazard ratchet: raw-timer).
 *
 * Calls resolve globalThis.setTimeout / setInterval at call time (fake timers in tests keep
 * working) and pass arguments through unchanged — same return value, same semantics.
 */
function nativeSetTimeout(fn, ms, ...args) { return globalThis.setTimeout(fn, ms, ...args); }
function nativeSetInterval(fn, ms, ...args) { return globalThis.setInterval(fn, ms, ...args); }
function nativeClearTimeout(t) { return globalThis.clearTimeout(t); }
function nativeClearInterval(t) { return globalThis.clearInterval(t); }

module.exports = { nativeSetTimeout, nativeSetInterval, nativeClearTimeout, nativeClearInterval };
