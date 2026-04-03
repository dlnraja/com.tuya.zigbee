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

/** Check if value is valid */
function _v(x) { return x && typeof x === 'string' && x.trim() && x !== 'unknown'; }
function _g(f) { try { const r = f(); return _v(r) ? r.trim() : null; } catch(e) { return null; } }

// ZCL-only manufacturers (no Tuya DP)
const ZCL_ONLY_MFRS = [
  '_TZ3000_blhvsaqf', '_TZ3000_ysdv91bk', '_TZ3000_hafsqare',
  '_TZ3000_e98krvvk', '_TZ3000_iedbgyxt', '_TZ3000_l9brjwau',
  '_TZ3000_qkixdnon', '_TZ3002_pzao9ls1', '_TZ3002_vaq2bfcu'
];

/**
 * Get manufacturer name with ROBUST fallback chain
 * v5.7.51: Each source checked with _g() for proper null/empty handling
 */
function getManufacturerName(device) {
  if (!device) return '';
  
  // Try each source with validation - first valid wins
  return _g(() => device.getSetting?.('zb_manufacturer_name'))
      || _g(() => device.getSetting?.('zb_manufacturerName'))
      || _g(() => device.getStoreValue?.('zb_manufacturer_name'))
      || _g(() => device.getStoreValue?.('manufacturerName'))
      || _g(() => device.getData?.()?.manufacturerName)
      || _g(() => device.zclNode?.manufacturerName)
      || _g(() => device._manufacturerName)
      || _g(() => device._cachedManufacturerName)
      || _g(() => device.driver?.manifest?.zigbee?.manufacturerName?.[0])
      || '';
}

/**
 * Get model ID with ROBUST fallback chain
 * v5.7.51: Each source checked with _g() for proper null/empty handling
 */
function getModelId(device) {
  if (!device) return '';
  
  return _g(() => device.getSetting?.('zb_model_id'))
      || _g(() => device.getSetting?.('zb_modelId'))
      || _g(() => device.getStoreValue?.('zb_model_id'))
      || _g(() => device.getStoreValue?.('modelId'))
      || _g(() => device.getStoreValue?.('productId'))
      || _g(() => device.getData?.()?.modelId)
      || _g(() => device.getData?.()?.productId)
      || _g(() => device.zclNode?.modelId)
      || _g(() => device._modelId)
      || _g(() => device.driver?.manifest?.zigbee?.productId?.[0])
      || '';
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
 * ASYNC: Read manufacturer from basic cluster (last resort)
 * Use when sync methods fail - reads directly from device
 */
async function readManufacturerFromCluster(device) {
  try {
    const basic = device.zclNode?.endpoints?.[1]?.clusters?.basic;
    if (basic?.readAttributes) {
      const attrs = await basic.readAttributes(['manufacturerName', 'modelId']);
      if (_v(attrs?.manufacturerName)) {
        device._cachedManufacturerName = attrs.manufacturerName.trim();
        device.log?.(`[MFR-HELPER] Read from cluster: ${device._cachedManufacturerName}`);
      }
      if (_v(attrs?.modelId)) {
        device._cachedModelId = attrs.modelId.trim();
      }
      return { mfr: device._cachedManufacturerName || '', model: device._cachedModelId || '' };
    }
  } catch (e) {
    device.log?.(`[MFR-HELPER] Cluster read failed: ${e.message}`);
  }
  return { mfr: '', model: '' };
}

/**
 * v5.8.57: ENSURE manufacturer settings are populated
 * Resolves mfr+model from all fallbacks, reads basic cluster if needed,
 * and writes back to zb_manufacturer_name / zb_model_id settings if blank.
 * Call this from every base class onNodeInit() to prevent blank mfr bugs.
 */
async function ensureManufacturerSettings(device) {
  if (!device) return;
  try {
    let mfr = getManufacturerName(device);
    let model = getModelId(device);

    // If still blank after sync fallbacks, try async basic cluster read
    if (!mfr || !model) {
      const fromCluster = await readManufacturerFromCluster(device);
      mfr = mfr || fromCluster.mfr;
      model = model || fromCluster.model;
    }

    // Write back to settings if they were blank
    const settings = device.getSettings?.() || {};
    const updates = {};

    if (!_v(settings.zb_manufacturer_name) && _v(mfr)) {
      updates.zb_manufacturer_name = mfr;
    }
    if (!_v(settings.zb_model_id) && _v(model)) {
      updates.zb_model_id = model;
    }

    if (Object.keys(updates).length > 0) {
      await device.setSettings?.(updates);
      device.log?.(`[MFR-ENSURE] ✅ Wrote missing settings: ${JSON.stringify(updates)}`);
    }

    // Also cache on device instance for fast access
    if (_v(mfr)) device._cachedManufacturerName = mfr;
    if (_v(model)) device._cachedModelId = model;
  } catch (e) {
    device.log?.(`[MFR-ENSURE] ⚠️ ${e.message}`);
  }
}

/**
 * DEBUG: Log all sources and their values
 */
function debugManufacturerSources(device) {
  if (!device?.log) return;
  device.log('[MFR-DEBUG] ═══════════════════════════════════════');
  device.log(`[MFR-DEBUG] getSetting('zb_manufacturer_name'): ${device.getSetting?.('zb_manufacturer_name') || '(empty)'}`);
  device.log(`[MFR-DEBUG] getStoreValue('manufacturerName'): ${device.getStoreValue?.('manufacturerName') || '(empty)'}`);
  device.log(`[MFR-DEBUG] getData().manufacturerName: ${device.getData?.()?.manufacturerName || '(empty)'}`);
  device.log(`[MFR-DEBUG] zclNode.manufacturerName: ${device.zclNode?.manufacturerName || '(empty)'}`);
  device.log(`[MFR-DEBUG] _manufacturerName: ${device._manufacturerName || '(empty)'}`);
  device.log(`[MFR-DEBUG] driver.manifest: ${device.driver?.manifest?.zigbee?.manufacturerName?.[0] || '(empty)'}`);
  device.log(`[MFR-DEBUG] RESULT: ${getManufacturerName(device) || '(EMPTY!)'}`);
  device.log('[MFR-DEBUG] ═══════════════════════════════════════');
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
  
  // Async: ensure settings populated (call from onNodeInit)
  ensureManufacturerSettings,
  
  // Async cluster read (last resort)
  readManufacturerFromCluster,
  
  // Debug
  debugManufacturerSources,
  
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
