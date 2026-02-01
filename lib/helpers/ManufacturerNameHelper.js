'use strict';

const CI = require('../utils/CaseInsensitiveMatcher');

/**
 * ManufacturerNameHelper - v5.7.50
 * 
 * UNIFIED manufacturer name retrieval with FALLBACK CHAIN.
 * All comparisons are CASE-INSENSITIVE.
 * 
 * Use this throughout the app to avoid empty manufacturer names.
 */

// ZCL-only manufacturers (no Tuya DP)
const ZCL_ONLY_MFRS = [
  '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare',
  '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt', '_TZ3000_l9brjwau',
  '_TZ3000_qkixdnon', '_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu'
];

/**
 * Get manufacturer name with full fallback chain
 */
function getManufacturerName(device) {
  if (!device) return '';
  
  // Try all sources in priority order
  const val = device.getSetting?.('zb_manufacturer_name')
    || device.getSetting?.('zb_manufacturerName')
    || device.getStoreValue?.('zb_manufacturer_name')
    || device.getStoreValue?.('manufacturerName')
    || device.getData?.()?.manufacturerName
    || device.zclNode?.manufacturerName
    || device._manufacturerName
    || device._cachedManufacturerName
    || device.driver?.manifest?.zigbee?.manufacturerName?.[0]
    || '';
  
  return (val || '').trim();
}

/**
 * Get model ID with full fallback chain
 */
function getModelId(device) {
  if (!device) return '';
  
  const val = device.getSetting?.('zb_model_id')
    || device.getSetting?.('zb_modelId')
    || device.getStoreValue?.('zb_model_id')
    || device.getStoreValue?.('modelId')
    || device.getStoreValue?.('productId')
    || device.getData?.()?.modelId
    || device.getData?.()?.productId
    || device.zclNode?.modelId
    || device._modelId
    || device.driver?.manifest?.zigbee?.productId?.[0]
    || '';
  
  return (val || '').trim();
}

/**
 * Get both manufacturer and model
 */
function getDeviceIdentity(device) {
  return {
    manufacturerName: getManufacturerName(device),
    modelId: getModelId(device)
  };
}

/**
 * Check if device uses Tuya DP protocol (TS0601 or _TZE*)
 */
function isTuyaDPDevice(device) {
  const model = getModelId(device);
  const mfr = getManufacturerName(device);
  return CI.equalsCI(model, 'TS0601') || CI.startsWithCI(mfr, '_TZE');
}

/**
 * Check if device is ZCL-only (no Tuya DP cluster)
 */
function isZclOnlyDevice(device) {
  const mfr = getManufacturerName(device);
  return ZCL_ONLY_MFRS.some(z => CI.containsCI(mfr, z));
}

/**
 * Check if manufacturer matches list (case-insensitive)
 */
function matchesManufacturer(device, list) {
  const mfr = getManufacturerName(device);
  if (!mfr) return false;
  const arr = Array.isArray(list) ? list : [list];
  return CI.includesCI(arr, mfr);
}

/**
 * Check if manufacturer starts with prefix (case-insensitive)
 */
function hasManufacturerPrefix(device, prefixes) {
  const mfr = getManufacturerName(device);
  if (!mfr) return false;
  const arr = Array.isArray(prefixes) ? prefixes : [prefixes];
  return arr.some(p => CI.startsWithCI(mfr, p));
}

/**
 * Check if model matches list (case-insensitive)
 */
function matchesModel(device, list) {
  const model = getModelId(device);
  if (!model) return false;
  const arr = Array.isArray(list) ? list : [list];
  return CI.includesCI(arr, model);
}

module.exports = {
  // Main functions
  getManufacturerName,
  getModelId,
  getDeviceIdentity,
  
  // Protocol detection
  isTuyaDPDevice,
  isZclOnlyDevice,
  
  // Matching (case-insensitive)
  matchesManufacturer,
  hasManufacturerPrefix,
  matchesModel,
  
  // Re-export CaseInsensitiveMatcher
  ...CI,
  
  // Constants
  ZCL_ONLY_MANUFACTURERS: ZCL_ONLY_MFRS
};
