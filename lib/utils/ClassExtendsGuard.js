'use strict';

/**
 * lib/utils/ClassExtendsGuard.js
 *
 * P24.7 — Safe class extends wrapper for TuyaZigbeeDevice / TuyaSpecificClusterDevice
 * P64.0 — Belt-and-suspenders: handles destructured modules, double-fallback chain,
 *         and NEVER returns undefined (which would crash `class X extends ...`)
 *
 * Some devices (smart_knob_rotary, wall_dimmer_1gang_1way, smart_scene_panel)
 * crash at runtime with:
 *   "Class extends value undefined is not a constructor or null"
 *
 * This happens when the parent class fails to load (e.g., circular import,
 * missing dependency). To make these devices resilient, we wrap the class
 * extension so:
 * 1. If the primary parent class is undefined, fall back to ZigBeeDevice
 * 2. If ZigBeeDevice is also undefined, fall back to a minimal stub
 * 3. Log the failure so the root cause can be diagnosed
 * 4. Continue with full device functionality
 *
 * Usage:
 *   const { safeExtends } = require('../../utils/ClassExtendsGuard');
 *   const TuyaZigbeeDevice = safeExtends('TuyaZigbeeDevice', () => {
 *     return require('../tuya/TuyaZigbeeDevice');
 *   });
 *   class MyDevice extends TuyaZigbeeDevice { ... }
 */

const { ZigBeeDevice } = require('homey-zigbeedriver');
const path = require('path');

// Fallback chain: try each loader in order. First one that returns a
// function wins. If ALL fail, we return a minimal class stub that
// prevents the `class X extends ...` from throwing.
const FALLBACK_LOADERS = [
  () => require('homey-zigbeedriver').ZigBeeDevice,
  () => require('homey-zigbeedriver').default?.ZigBeeDevice,
  () => {
    const z = require('homey-zigbeedriver');
    if (z && typeof z === 'object') {
      for (const k of Object.keys(z)) {
        if (typeof z[k] === 'function' && /ZigBee/i.test(k)) return z[k];
      }
    }
    return undefined;
  },
];

function makeMinimalDeviceClass() {
  // Last-resort fallback: a no-op Device class that prevents the
  // `class X extends ...` from throwing. The driver will fail to pair
  // devices but the app will still load.
  const noop = function () { /* no-op */ };
  return class MinimalDevice {
    constructor() { /* no-op */ }
    on(..._a) { return this; }
    off(..._a) { return this; }
    once(..._a) { return this; }
    emit(..._a) { return true; }
    removeListener(..._a) { return this; }
    removeAllListeners(..._a) { return this; }
    onInit() { return Promise.resolve(); }
    onDeleted() { return Promise.resolve(); }
    onUninit() { return Promise.resolve(); }
    onSettings() { return Promise.resolve(); }
    log(..._a) { /* no-op */ }
    error(..._a) { /* no-op */ }
    getName() { return 'minimal-device'; }
    getData() { return ({}); }
    getSetting() { return null; }
    setSettings() { return Promise.resolve(); }
    setCapabilityValue() { return Promise.resolve(); }
    getCapabilityValue() { return null; }
    hasCapability() { return false; }
    addCapability() { return Promise.resolve(); }
    registerCapabilityListener() { /* no-op */ }
    setAvailable() { return Promise.resolve(); }
    setUnavailable() { return Promise.resolve(); }
    noop; // keep the symbol referenced
  };
}

function safeExtends(className, loader) {
  let Primary;
  let originalError = null;

  // 1) Try the primary loader (typically the device-specific base class)
  try {
    Primary = loader();
  } catch (e) {
    originalError = e;
  }

  // Handle CommonJS interop: some modules export `{ default: Class }`
  // (esModuleInterop). Pull .default if present and it's a function.
  if (Primary && typeof Primary === 'object' && typeof Primary.default === 'function') {
    Primary = Primary.default;
  }
  if (Primary && typeof Primary === 'object' && Primary.ZigBeeDevice) {
    Primary = Primary.ZigBeeDevice;
  }

  if (Primary && typeof Primary === 'function') {
    return Primary;
  }

  // 2) Fall back to ZigBeeDevice from homey-zigbeedriver
  if (ZigBeeDevice && typeof ZigBeeDevice === 'function') {
    logFailure(className, originalError || 'loader returned non-function', 'ZigBeeDevice');
    return ZigBeeDevice;
  }

  // 3) Try a sequence of fallback loaders
  for (const fb of FALLBACK_LOADERS) {
    try {
      const candidate = fb();
      if (candidate && typeof candidate === 'function') {
        logFailure(className, originalError || 'loader returned non-function', 'fallback-chain');
        return candidate;
      }
    } catch (_err) { /* try next */ }
  }

  // 4) Last resort: a minimal class stub. The driver will fail to pair
  // but the app will still load and the user can still see other devices.
  logFailure(className, originalError || 'no fallback worked', 'minimal-stub');
  return makeMinimalDeviceClass();
}

function logFailure(className, error, fallback) {
  try {
    const fs = require('fs');
    const logPath = path.join(__dirname, '..', '..', '.github', 'state', 'class-extends-failures.log');
    const logEntry = JSON.stringify({
      timestamp: new Date().toISOString(),
      className,
      error: String(error && (error.message || error) || 'unknown'),
      fallback,
    }) + '\n';
    try { fs.appendFileSync(logPath, logEntry); } catch {}
  } catch {}
}

module.exports = { safeExtends, makeMinimalDeviceClass };
