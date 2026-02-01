'use strict';

const MfrHelper = require('./ManufacturerNameHelper');

/**
 * DeviceDataHelper - Unified device data access
 * v5.7.50: Now uses ManufacturerNameHelper for case-insensitive matching
 *
 * Homey stores device data with inconsistent property names.
 * This helper provides a unified interface to access modelId, manufacturer, etc.
 */

/**
 * Get device model ID from any possible property
 * v5.7.50: Uses ManufacturerNameHelper with full fallback chain
 * @param {Object} device - Homey device instance
 * @returns {string} Model ID or empty string
 */
function getModelId(device) {
  return MfrHelper.getModelId(device);
}

/**
 * Get device manufacturer from any possible property
 * v5.7.50: Uses ManufacturerNameHelper with full fallback chain
 * @param {Object} device - Homey device instance
 * @returns {string} Manufacturer or empty string
 */
function getManufacturer(device) {
  return MfrHelper.getManufacturerName(device);
}

/**
 * Get unified device info object
 * @param {Object} device - Homey device instance
 * @returns {Object} Unified device info
 */
function getDeviceInfo(device) {
  return {
    modelId: getModelId(device),
    manufacturer: getManufacturer(device),
    zclNode: device?.zclNode || null
  };
}

/**
 * Check if device is Tuya DP (TS0601 / _TZE*)
 * v5.7.50: Uses case-insensitive matching via MfrHelper
 *
 * IMPORTANT: Only TS0601 and _TZE* devices use Tuya DP protocol.
 * TS0001, TS0002, TS0003, etc. with _TZ3000 are STANDARD Zigbee switches!
 *
 * @param {Object} device - Homey device instance
 * @returns {boolean} True if Tuya DP device
 */
function isTuyaDPDevice(device) {
  const modelId = getModelId(device);
  const manufacturer = getManufacturer(device);

  // EXCLUSION LIST: Known NON-Tuya manufacturers (case-insensitive)
  const nonTuyaManufacturers = [
    'HOBEIAN', 'PHILIPS', 'IKEA', 'OSRAM', 'LEDVANCE', 'HEIMAN',
    'XIAOMI', 'LUMI', 'SONOFF', 'EWELINK', 'GLEDOPTO', 'INNR',
    'SENGLED', 'CENTRALITE', 'SMARTTHINGS', 'SAMJIN', 'ZIGBEE2MQTT',
  ];

  if (nonTuyaManufacturers.some(m => MfrHelper.containsCI(manufacturer, m))) {
    return false;
  }

  // STANDARD ZIGBEE MODELS - These are NOT Tuya DP (case-insensitive)
  const standardZigbeeModels = [
    'TS0001', 'TS0002', 'TS0003', 'TS0004',     // Standard switches
    'TS0011', 'TS0012', 'TS0013', 'TS0014',     // No-neutral switches
    'TS0101', 'TS0111', 'TS0112', 'TS0115',     // Plugs
    'TS0121', 'TS011F',                          // Power plugs
    'TS0201', 'TS0202', 'TS0203', 'TS0207',     // Standard sensors
    'TS0041', 'TS0042', 'TS0043', 'TS0044',     // Scene switches
    'TS0501', 'TS0502', 'TS0503', 'TS0504', 'TS0505', // Dimmers/lights
  ];

  if (MfrHelper.includesCI(standardZigbeeModels, modelId)) {
    return false; // NOT Tuya DP - standard Zigbee
  }

  // TS0601 is ALWAYS Tuya DP (case-insensitive)
  if (MfrHelper.equalsCI(modelId, 'TS0601')) {
    return true;
  }

  // _TZE prefix = Tuya DP (case-insensitive)
  if (MfrHelper.startsWithCI(manufacturer, '_TZE')) {
    return true;
  }

  // Drivers that ONLY support Tuya DP devices
  const tuyaDPOnlyDrivers = ['soil_sensor', 'climate_sensor', 'thermostat_tuya'];
  const driverId = device.driver?.id || '';
  if (tuyaDPOnlyDrivers.includes(driverId)) {
    return true;
  }

  // Default: NOT Tuya DP
  return false;
}

/**
 * Check if device is mains-powered (no battery)
 * v5.7.50: Uses case-insensitive matching
 * @param {Object} device - Homey device instance
 * @returns {boolean} True if mains-powered
 */
function isMainsPowered(device) {
  const modelId = getModelId(device);
  const driverId = device.driver?.id || '';

  // Mains-powered models (case-insensitive)
  const mainsPoweredModels = [
    'TS0001', 'TS0002', 'TS0003', 'TS0004',     // Switches
    'TS0011', 'TS0012', 'TS0013', 'TS0014',     // No-neutral switches
    'TS0101', 'TS0111', 'TS0112', 'TS0115',     // Plugs
    'TS0121', 'TS011F',                          // Power plugs
    'TS0501', 'TS0502', 'TS0503', 'TS0504', 'TS0505', // Dimmers
  ];

  // Mains-powered drivers
  const mainsPoweredDrivers = [
    'switch_1gang', 'switch_2gang', 'switch_3gang', 'switch_4gang',
    'socket', 'socket_power', 'socket_2usb', 'socket_power_2usb',
    'dimmer', 'dimmer_2gang', 'light_rgb', 'light_rgbw',
    'curtain_motor', 'garage_door',
  ];

  if (MfrHelper.includesCI(mainsPoweredModels, modelId)) {
    return true;
  }

  if (mainsPoweredDrivers.includes(driverId)) {
    return true;
  }

  // Check device property
  if (device.mainsPowered === true) {
    return true;
  }

  return false;
}

/**
 * Log device info for debugging
 * @param {Object} device - Homey device instance
 * @param {string} prefix - Log prefix
 */
function logDeviceInfo(device, prefix = '[DEVICE]') {
  const info = getDeviceInfo(device);
  const isTuya = isTuyaDPDevice(device);
  const isMains = isMainsPowered(device);

  device?.log?.(`${prefix} Model: ${info.modelId || 'unknown'}`);
  device?.log?.(`${prefix} Manufacturer: ${info.manufacturer || 'unknown'}`);
  device?.log?.(`${prefix} Is Tuya DP: ${isTuya ? 'YES' : 'NO'}`);
  device?.log?.(`${prefix} Is Mains Powered: ${isMains ? 'YES' : 'NO'}`);
}

module.exports = {
  getModelId,
  getManufacturer,
  getDeviceInfo,
  isTuyaDPDevice,
  isMainsPowered,
  logDeviceInfo
};
