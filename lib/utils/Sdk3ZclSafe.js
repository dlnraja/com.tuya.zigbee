'use strict';

/**
 * Sdk3ZclSafe — Homey Apps SDK3 Zigbee init / ZCL promise helpers (P2547).
 *
 * Official docs (apps.developer.homey.app/wireless/zigbee):
 * - Avoid initiating node communication in onInit / onNodeInit
 * - Always catch ZCL promises (especially during init) or the device may stall
 * - Prefer onEndDeviceAnnounce for sleepy wake work over boot TX storms
 * - Manifest identity = manufacturerName + productId only
 *
 * WHY: Contre quoi = blind await without catch + boot radio flood (Peter OOM / SED miss).
 * HOW: Shared delay + catch wrappers used by sensors / collectors / adapters.
 * WHO: BOTH tracks (reliability).
 * WHEN: onNodeInit defer + any ZCL read/write/report path.
 */

const INIT_COMMUNICATION_DELAY_MS = 2000;

/**
 * Catch a ZCL/Homey promise the SDK3 way — never leave unhandled rejection.
 * @param {Promise} promise
 * @param {{ error?: Function, log?: Function }|null} device
 * @param {string} [label]
 * @returns {Promise<*>}
 */
function catchZcl(promise, device = null, label = 'zcl') {
  if (!promise || typeof promise.then !== 'function') {
    return Promise.resolve(promise);
  }
  return promise.catch((err) => {
    const msg = err && err.message ? err.message : String(err);
    try {
      if (device && typeof device.error === 'function') {
        device.error(`[SDK3-ZCL] ${label}: ${msg}`);
      } else if (device && typeof device.log === 'function') {
        device.log(`[SDK3-ZCL] ${label}: ${msg}`);
      }
    } catch (_e) { /* device may be destroyed */ }
    return undefined;
  });
}

/**
 * Schedule work AFTER onNodeInit completes (SDK3 deferred communication).
 * @param {object} device Homey device (needs homey.setTimeout or global)
 * @param {Function} fn async or sync callback
 * @param {number} [delayMs]
 * @returns {any} timeout handle when available
 */
function scheduleDeferredInit(device, fn, delayMs = INIT_COMMUNICATION_DELAY_MS) {
  const run = () => {
    try {
      if (device && device._destroyed) return;
      const out = fn();
      if (out && typeof out.then === 'function') {
        catchZcl(out, device, 'deferred-init');
      }
    } catch (err) {
      catchZcl(Promise.reject(err), device, 'deferred-init');
    }
  };

  try {
    if (device && device.homey && typeof device.homey.setTimeout === 'function') {
      return device.homey.setTimeout(run, delayMs);
    }
  } catch (_e) { /* fall through */ }

  // No bare setTimeout — CI forbids native timers in lib/ (use Homey clock or sync).
  try {
    const { safeSetTimeout } = require('./safe-timers');
    if (typeof safeSetTimeout === 'function') {
      return safeSetTimeout(device, run, delayMs);
    }
  } catch (_e) { /* optional */ }

  run();
  return null;
}

/**
 * setCapabilityValue with mandatory .catch — raw SDK pattern from Athom docs.
 * Prefer device.safeSetCapabilityValue when available (L14).
 * @param {object} device
 * @param {string} capabilityId
 * @param {*} value
 * @returns {Promise<void>}
 */
function setCapabilityCaught(device, capabilityId, value) {
  if (!device) return Promise.resolve();
  if (typeof device.safeSetCapabilityValue === 'function') {
    return catchZcl(device.safeSetCapabilityValue(capabilityId, value), device, `cap:${capabilityId}`);
  }
  if (typeof device.setCapabilityValue === 'function') {
    return catchZcl(device.setCapabilityValue(capabilityId, value), device, `cap:${capabilityId}`);
  }
  return Promise.resolve();
}

module.exports = {
  INIT_COMMUNICATION_DELAY_MS,
  catchZcl,
  scheduleDeferredInit,
  setCapabilityCaught,
};
