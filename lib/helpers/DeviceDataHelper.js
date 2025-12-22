'use strict';

/**
 * DeviceDataHelper - Unified device data access
 *
 * Homey stores device data with inconsistent property names.
 * This helper provides a unified interface to access modelId, manufacturer, etc.
 */

/**
 * Get device model ID from any possible property
 * @param {Object} device - Homey device instance
 * @returns {string} Model ID or empty string
 */
function getModelId(device) {
  if (!device) return '';

  const data = device.getData?.() || {};
  const settings = device.getSettings?.() || {};

  // Try all possible sources in order of reliability
  return data.modelId
    || data.productId
    || data.zb_product_id
    || data.model
    || settings.modelId
    || settings.zb_modelId           // Standard Homey Zigbee setting
    || settings.zb_product_id
    || device.zclNode?.modelId
    || '';
}

/**
 * Get device manufacturer from any possible property
 * @param {Object} device - Homey device instance
 * @returns {string} Manufacturer or empty string
 */
function getManufacturer(device) {
  if (!device) return '';

  const data = device.getData?.() || {};
  const settings = device.getSettings?.() || {};

  // Try all possible sources in order of reliability
  return data.manufacturerName
    || data.manufacturer
    || data.zb_manufacturer_name
    || data.manufacturerId
    || settings.manufacturerName
    || settings.zb_manufacturerName  // Standard Homey Zigbee setting
    || settings.zb_manufacturer_name
    || device.zclNode?.manufacturerName
    || '';
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
 *
 * IMPORTANT: Only TS0601 and _TZE* devices use Tuya DP protocol.
 * TS0001, TS0002, TS0003, etc. with _TZ3000 are STANDARD Zigbee switches!
 *
 * @param {Object} device - Homey device instance
 * @returns {boolean} True if Tuya DP device
 */
function isTuyaDPDevice(device) {
  const modelId = getModelId(device).toUpperCase();
  const manufacturer = getManufacturer(device).toUpperCase();

  // EXCLUSION LIST: Known NON-Tuya manufacturers
  const nonTuyaManufacturers = [
    'HOBEIAN', 'PHILIPS', 'IKEA', 'OSRAM', 'LEDVANCE', 'HEIMAN',
    'XIAOMI', 'LUMI', 'SONOFF', 'EWELINK', 'GLEDOPTO', 'INNR',
    'SENGLED', 'CENTRALITE', 'SMARTTHINGS', 'SAMJIN', 'ZIGBEE2MQTT',
  ];

  if (nonTuyaManufacturers.some(m => manufacturer.includes(m))) {
    return false;
  }

  // STANDARD ZIGBEE MODELS - These are NOT Tuya DP even with _TZ3000 manufacturer
  // TS0001-TS0004 are standard on/off switches
  // TS0011-TS0014 are standard switches with different wiring
  // TS0101-TS0115 are standard plugs/outlets
  // TS0201-TS0207 are standard sensors
  const standardZigbeeModels = [
    'TS0001', 'TS0002', 'TS0003', 'TS0004',     // Standard switches
    'TS0011', 'TS0012', 'TS0013', 'TS0014',     // No-neutral switches
    'TS0101', 'TS0111', 'TS0112', 'TS0115',     // Plugs
    'TS0121', 'TS011F',                          // Power plugs
    'TS0201', 'TS0202', 'TS0203', 'TS0207',     // Standard sensors
    'TS0041', 'TS0042', 'TS0043', 'TS0044',     // Scene switches
    'TS0501', 'TS0502', 'TS0503', 'TS0504', 'TS0505', // Dimmers/lights
  ];

  if (standardZigbeeModels.includes(modelId)) {
    return false; // NOT Tuya DP - standard Zigbee
  }

  // TS0601 is ALWAYS Tuya DP - this is the key indicator
  if (modelId === 'TS0601') {
    return true;
  }

  // _TZE prefix (e.g., _TZE200_*, _TZE204_*, _TZE284_*) = Tuya DP
  if (manufacturer.startsWith('_TZE')) {
    return true;
  }

  // Drivers that ONLY support Tuya DP devices
  const tuyaDPOnlyDrivers = ['soil_sensor', 'climate_sensor', 'thermostat_tuya'];
  const driverId = device.driver?.id || '';
  if (tuyaDPOnlyDrivers.includes(driverId)) {
    return true;
  }

  // Default: NOT Tuya DP
  // Don't assume based on EF00 cluster or tuyaEF00Manager - too many false positives
  return false;
}

/**
 * Check if device is mains-powered (no battery)
 * @param {Object} device - Homey device instance
 * @returns {boolean} True if mains-powered
 */
function isMainsPowered(device) {
  const modelId = getModelId(device).toUpperCase();
  const driverId = device.driver?.id || '';

  // Mains-powered models (switches, plugs, dimmers)
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

  if (mainsPoweredModels.includes(modelId)) {
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
