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

  return data.modelId
    || data.productId
    || data.zb_product_id
    || data.model
    || settings.modelId
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

  return data.manufacturerName
    || data.manufacturer
    || data.zb_manufacturer_name
    || data.manufacturerId
    || settings.manufacturerName
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
  const manufacturer = getManufacturer(device);

  // TS0601 is ALWAYS Tuya DP
  if (modelId === 'TS0601') {
    return true;
  }

  // _TZE prefix means Tuya DP
  if (manufacturer.startsWith('_TZE')) {
    return true;
  }

  // Check for cluster 0xEF00
  const zclNode = device?.zclNode;
  if (zclNode?.endpoints) {
    for (const ep of Object.values(zclNode.endpoints)) {
      if (ep.clusters?.manuSpecificTuya ||
        ep.clusters?.tuyaManufacturer ||
        ep.clusters?.tuyaSpecific ||
        ep.clusters?.[0xEF00] ||
        ep.clusters?.[61184]) {
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
