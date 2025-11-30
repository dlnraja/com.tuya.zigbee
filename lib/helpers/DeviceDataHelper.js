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
 * @param {Object} device - Homey device instance
 * @returns {boolean} True if Tuya DP device
 */
function isTuyaDPDevice(device) {
  const modelId = getModelId(device).toUpperCase();
  const manufacturer = getManufacturer(device).toUpperCase();

  // EXCLUSION LIST: Known NON-Tuya manufacturers
  // These use standard Zigbee, NOT Tuya DP protocol
  const nonTuyaManufacturers = [
    'HOBEIAN',      // ZG-204ZL motion sensor - uses IAS Zone
    'PHILIPS',
    'IKEA',
    'OSRAM',
    'LEDVANCE',
    'HEIMAN',
    'XIAOMI',
    'LUMI',         // Aqara
    'SONOFF',
    'EWELINK',
    'GLEDOPTO',
    'INNR',
    'SENGLED',
    'CENTRALITE',
    'SMARTTHINGS',
    'SAMJIN',
    'ZIGBEE2MQTT',
  ];

  // If manufacturer is in exclusion list, NOT Tuya DP
  if (nonTuyaManufacturers.some(m => manufacturer.includes(m))) {
    return false;
  }

  // TS0601 is ALWAYS Tuya DP
  if (modelId === 'TS0601') {
    return true;
  }

  // _TZE prefix means Tuya DP
  if (manufacturer.startsWith('_TZE')) {
    return true;
  }

  // Check driver ID - soil_sensor and climate_sensor with TS0601 are Tuya DP
  const driverId = device.driver?.id || '';
  if ((driverId === 'soil_sensor' || driverId === 'climate_sensor') && !modelId) {
    // If we don't have modelId yet but driver is known Tuya DP driver
    // Assume Tuya DP to avoid false 100% battery
    return true;
  }

  // Check if TuyaEF00Manager is active (indicates Tuya DP mode)
  if (device.tuyaEF00Manager) {
    return true;
  }

  // _TZ3000, _TZ3210, etc. with TS0601 model OR cluster 0xEF00 = Tuya DP
  // But _TZ3000 devices WITHOUT TS0601 are usually standard Zigbee (not DP)
  const isTuyaPrefix = manufacturer.startsWith('_TZ');

  // Check for cluster 0xEF00 - ONLY trust if manufacturer is also Tuya-like
  const zclNode = device?.zclNode;
  if (zclNode?.endpoints && isTuyaPrefix) {
    for (const ep of Object.values(zclNode.endpoints)) {
      // Check for actual Tuya cluster presence
      if (ep.clusters?.[0xEF00] || ep.clusters?.[61184]) {
        return true;
      }
    }
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

  device?.log?.(`${prefix} Model: ${info.modelId || 'unknown'}`);
  device?.log?.(`${prefix} Manufacturer: ${info.manufacturer || 'unknown'}`);
  device?.log?.(`${prefix} Is Tuya DP: ${isTuya ? 'YES' : 'NO'}`);
}

module.exports = {
  getModelId,
  getManufacturer,
  getDeviceInfo,
  isTuyaDPDevice,
  logDeviceInfo
};
