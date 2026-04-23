'use strict';
const CI = require('./CaseInsensitiveMatcher');

const { CLUSTERS } = require('../constants/ZigbeeConstants.js');


/**
 * Centralized Tuya Device Detection Utilities
 * v5.2.77: Single source of truth for Tuya DP device detection
 *
 * PROBLEM: Multiple modules had their own Tuya detection logic, causing inconsistencies:
 * - SAFE-MIGRATE said "Standard Zigbee"
 * - BATTERY-READER said "Tuya DP device"
 * - CLUSTER-CONFIG disabled climate when no cluster found
 *
 * SOLUTION: This module provides ONE function used everywhere
 */

/**
 * Tuya DP device signatures
 * These devices use proprietary Tuya DataPoints (CLUSTERS.TUYA_EF00) instead of standard ZCL clusters
 */
const TUYA_DP_SIGNATURES = [
  // TS0601 with various manufacturer prefixes
  { modelId: 'TS0601', manufacturerPrefix: '_TZE200_' },
  { modelId: 'TS0601', manufacturerPrefix: '_TZE204_' },
  { modelId: 'TS0601', manufacturerPrefix: '_TZE284_' },
  { modelId: 'TS0601', manufacturerPrefix: '_TZE210_' },

  // Specific known Tuya DP models
  { modelId: 'TS0601', manufacturerName: 'HOBEIAN' },
  { modelId: 'TS0601', manufacturerName: 'SONOFF' },

  // Other Tuya DP devices
  { modelId: 'TS0202', manufacturerPrefix: '_TZ3000_' }, // Some PIR sensors
  { modelId: 'TS0203', manufacturerPrefix: '_TZ3000_' }, // Some door sensors
];

/**
 * List of manufacturer prefixes that indicate Tuya DP devices
 */
const TUYA_DP_PREFIXES = [
  '_TZE200_',
  '_TZE204_',
  '_TZE284_',
  '_TZE210_',
];

/**
 * Check if a device is a Tuya DP device (uses CLUSTERS.TUYA_EF00 cluster instead of standard ZCL)
 *
 * @param {Object} device - Homey device or ZigBee node
 * @returns {boolean} - True if device uses Tuya DP protocol
 */
function isTuyaDpDevice(device) {
  if (!device) return false;

  // Try to get model and manufacturer from various sources
  const modelId = _getModelId(device);
  const manufacturerName = _getManufacturerName(device);

  // Debug log (only in development)
  // console.log('[tuyaUtils] Checking:', { modelId, manufacturerName });

  if (!modelId && !manufacturerName) {
    return false;
  }

  // Check against signatures
  for (const sig of TUYA_DP_SIGNATURES) {
    if (sig.modelId && !CI.equalsCI(modelId, sig.modelId)) continue;

    if (sig.manufacturerPrefix) {
      if (manufacturerName && CI.startsWithCI(manufacturerName, sig.manufacturerPrefix)) {
        return true;
      }
    }

    if (sig.manufacturerName) {
      if (manufacturerName && CI.equalsCI(manufacturerName, sig.manufacturerName)) {
        return true;
      }
    }
  }

  // Fallback: Check if manufacturer starts with any known Tuya prefix
  if (manufacturerName) {
    for (const prefix of TUYA_DP_PREFIXES) {
      if (CI.startsWithCI(manufacturerName, prefix)) {
        return true;
      }
    }
  }

  // Fallback: TS0601 is almost always Tuya DP
  if (CI.equalsCI(modelId, 'TS0601')) {
    return true;
  }

  return false;
}

/**
 * Get the model ID from various device object formats
 * @private
 */
function _getModelId(device) {
  // Homey ZigBeeDevice
  if (typeof device.getSetting === 'function') {
    const setting = device.getSetting('zb_model_id');
    if (setting) return setting;
  }

  // Direct property access
  if (device.modelId) return device.modelId;

  // ZCL node
  if (device.zclNode?.modelId) return device.zclNode.modelId || null;
  if (device.node?.modelId) return device.node.modelId || null;

  // getData for Homey devices
  if (typeof device.getData === 'function') {
    const data = device.getData();
    if (data?.modelId) return data.modelId || null;
  }

  // Store value
  if (typeof device.getStoreValue === 'function') {
    const stored = device.getStoreValue('modelId');
    if (stored) return stored;
  }

  return null;
}

/**
 * Get the manufacturer name from various device object formats
 * @private
 */
function _getManufacturerName(device) {
  // Homey ZigBeeDevice
  if (typeof device.getSetting === 'function') {
    const setting = device.getSetting('zb_manufacturer_name');
    if (setting) return setting;
  }

  // Direct property access
  if (device.manufacturerName) return device.manufacturerName;

  // ZCL node
  if (device.zclNode?.manufacturerName) return device.zclNode.manufacturerName || null;
  if (device.node?.manufacturerName) return device.node.manufacturerName || null;

  // getData for Homey devices
  if (typeof device.getData === 'function') {
    const data = device.getData();
    if (data?.manufacturerName) return data.manufacturerName || null;
  }

  // Store value
  if (typeof device.getStoreValue === 'function') {
    const stored = device.getStoreValue('manufacturerName');
    if (stored) return stored;
  }

  return null;
}

/**
 * Get device info for logging
 * @param {Object} device - Device object
 * @returns {Object} - { modelId, manufacturerName, isTuyaDP }
 */
function getDeviceInfo(device) {
  const modelId = _getModelId(device);
  const manufacturerName = _getManufacturerName(device);
  const isTuyaDP = isTuyaDpDevice(device);

  return { modelId, manufacturerName, isTuyaDP };
}

/**
 * Get a readable device (name/identifier) for logging
 * @param {Object} device - Device object
 * @returns {string} - Device name or ID
 */
function getDeviceNameOrId(device) {
  if (!device) return 'unknown';

  // Try getName first
  if (typeof device.getName === 'function') {
    const name = device.getName();
    if (name) return name;
  }

  // Try getData().id
  if (typeof device.getData === 'function') {
    const data = device.getData();
    if (data?.id) return data.id || null;
  }

  // Fallback to device.id
  if (device.id) return device.id;

  return 'unknown';
}

/**
 * Log device detection result consistently
 * @param {Object} device - Device object
 * @param {Function} logFn - Logging function (device.log)
 */
function logTuyaDetection(device, logFn) {
  const info = getDeviceInfo(device);
  const nameOrId = getDeviceNameOrId(device);

  if (info.isTuyaDP) {
    logFn(`[TUYA-DETECT]  ${nameOrId} is Tuya DP device (${info.modelId} / ${info.manufacturerName})`);
  } else {
    logFn(`[TUYA-DETECT]  ${nameOrId} is Standard Zigbee (${info.modelId} / ${info.manufacturerName})`);
  }

  return info;
}

/**
 * Safe numeric parser to prevent NaN errors in capability reporting
 * @param {any} value - Input value
 * @param {number} divisor - Optional divisor
 * @param {number} fallback - Fallback value if NaN (default null)
 */
function safeParse(value, divisor = 1, fallback = null) {
  if (value === null || value === undefined) return fallback;
  const num = Number(value);
  if (Number.isNaN(num)) return fallback;
  if (divisor === 0) return fallback;
  return safeDivide(num, divisor);
}

/**
 * Safe division utility to prevent division by zero and NaN
 * @param {number} numerator 
 * @param {number} denominator 
 * @param {number} fallback 
 */
function safeDivide(numerator, denominator, fallback = 0) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (Number.isNaN(n) || Number.isNaN(d) || d === 0) return fallback;
  return n / d;
}

/**
 * Safe multiplication utility to prevent NaN
 * @param {number} a 
 * @param {number} b 
 * @param {number} fallback 
 */
function safeMultiply(a, b, fallback = 0) {
  const numA = Number(a);
  const numB = Number(b);
  if (Number.isNaN(numA) || Number.isNaN(numB)) return fallback;
  return numA * numB;
}

module.exports = {
  isTuyaDpDevice,
  getDeviceInfo,
  getDeviceNameOrId,
  logTuyaDetection,
  safeParse,
  safeDivide,
  safeMultiply,
  TUYA_DP_SIGNATURES,
  TUYA_DP_PREFIXES,
};
