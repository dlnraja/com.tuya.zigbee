'use strict';

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * UNIVERSAL ZIGBEE DEVICE FINGERPRINT DATABASE
 * ══════════════════════════════════════════════════════════════════════════════
 * 
 * v8.0.0: Externalized all 59,550+ fingerprints to dynamic JSON storage:
 *         -> data/fingerprints.json
 * v9.8.0: LAZY-LOADING to prevent OOM crash on Homey Pro (Issue #338)
 *         The 11.5MB fingerprints.json is now loaded ONLY on first access,
 *         not at module initialization. This prevents V8 heap exhaustion
 *         during app startup on Homey Pro (64MB heap limit).
 * 
 * [ignoring loop detection]
 */

const fs = require('fs');
const path = require('path');

/**
 * v9.8.0: Lazy-Loading Fingerprint Database
 * Defers JSON parsing until first API call to prevent OOM at startup.
 */
let DEVICE_FINGERPRINTS = null; // null = not loaded yet
let _loaded = false;
let _loadAttempted = false;
let _loading = false;
let _compoundDb = null;
let _lowercaseIndex = null;

const FINGERPRINT_PATHS = [
  path.resolve(__dirname, './fingerprints.json'),          // Broad bundled catalog
  path.resolve(__dirname, '../data/fingerprints.json'),    // Bundled lib/data override
  path.resolve(__dirname, '../../data/fingerprints.json'), // Root curated override
  path.join(process.cwd(), 'data', 'fingerprints.json'),   // CWD override
  '/app/data/fingerprints.json'                            // Absolute Homey override
];

function _getCompoundDb() {
  if (_compoundDb !== null) return _compoundDb;
  try {
    _compoundDb = require('../DeviceFingerprintDB');
  } catch (err) {
    _compoundDb = false;
  }
  return _compoundDb || null;
}

function _readFingerprintSource(fpath) {
  if (!fs.existsSync(fpath)) return null;
  let rawBuffer = fs.readFileSync(fpath);
  try {
    const data = JSON.parse(rawBuffer);
    rawBuffer = null;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return data;
  } finally {
    rawBuffer = null;
  }
}

function _loadMergedFingerprintSources() {
  const merged = {};
  const seen = new Set();

  for (const fpath of FINGERPRINT_PATHS) {
    const resolved = path.resolve(fpath);
    if (seen.has(resolved)) continue;
    seen.add(resolved);

    try {
      const data = _readFingerprintSource(resolved);
      if (!data) continue;
      Object.assign(merged, data);
    } catch (err) {
      // Continue with the next source; diagnostics scripts audit source health.
    }
  }

  return merged;
}

function _buildLowercaseIndex() {
  _lowercaseIndex = new Map();
  if (DEVICE_FINGERPRINTS && typeof DEVICE_FINGERPRINTS === 'object') {
    for (const key of Object.keys(DEVICE_FINGERPRINTS)) {
      _lowercaseIndex.set(key.toLowerCase(), key);
    }
  }
}

/**
 * Lazy-load the fingerprints database on first access.
 * Returns empty object if all paths fail (graceful degradation).
 */
function _ensureLoaded() {
  if (DEVICE_FINGERPRINTS !== null) return DEVICE_FINGERPRINTS;
  if (_loading) return {}; // Prevent re-entrant loading
  _loading = true;
  _loadAttempted = true;

  // Run GC before loading if exposed
  if (typeof global.gc === 'function') {
    try { global.gc(); } catch (e) {}
  }

  DEVICE_FINGERPRINTS = _loadMergedFingerprintSources();
  if (Object.keys(DEVICE_FINGERPRINTS).length > 0) {
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (e) {}
    }
    _buildLowercaseIndex();
    _loaded = true;
    _loading = false;
    return DEVICE_FINGERPRINTS;
  }

  // All paths failed — try require fallback
  try {
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (e) {}
    }
    DEVICE_FINGERPRINTS = require('../../data/fingerprints.json');
    _buildLowercaseIndex();
    _loaded = true;
  } catch (e) {
    DEVICE_FINGERPRINTS = {};
  }
  _loading = false;
  return DEVICE_FINGERPRINTS;
}

function _parseCompoundDpMap(dpMap) {
  if (!dpMap || typeof dpMap !== 'object') return undefined;
  const dps = {};
  for (const [dpId, value] of Object.entries(dpMap)) {
    if (typeof value !== 'string') {
      dps[dpId] = value;
      continue;
    }
    const [capability, divisorText] = value.split('/');
    const [multCapability, multiplierText] = value.split('*');
    if (divisorText) {
      dps[dpId] = { capability, divisor: Number(divisorText) || 1 };
    } else if (multiplierText) {
      dps[dpId] = { capability: multCapability, multiplier: Number(multiplierText) || 1 };
    } else {
      dps[dpId] = { capability: value };
    }
  }
  return dps;
}

function _lookupCompoundFingerprint(manufacturerName, modelId) {
  if (!manufacturerName || !modelId) return null;
  const compoundDb = _getCompoundDb();
  if (!compoundDb?.lookup) return null;

  const profile = compoundDb.lookup(manufacturerName, modelId);
  if (!profile?.driver || !['exact', 'exact_ci'].includes(profile.matchType)) return null;

  return {
    driverId: profile.driver,
    type: profile.type || profile.driver,
    powerSource: profile.powerSource || null,
    modelIds: [modelId],
    dps: _parseCompoundDpMap(profile.dp),
    compoundKey: profile.key,
    matchType: profile.matchType,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getFingerprint(manufacturerName, modelId) {
  const compound = _lookupCompoundFingerprint(manufacturerName, modelId);
  if (compound) {
    const fallback = getFingerprint(manufacturerName);
    return { ...(fallback || {}), ...compound };
  }

  const db = _ensureLoaded();
  const mfrLower = (manufacturerName || '').toLowerCase();
  if (_lowercaseIndex) {
    const originalKey = _lowercaseIndex.get(mfrLower);
    return originalKey ? db[originalKey] : null;
  }
  return null;
}

function getDriverId(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  if (fp) {
    const modelLower = (modelId || '').toLowerCase();
    if (modelId && fp.modelIds && !fp.modelIds.some(m => m.toLowerCase() === modelLower)) {
      console.log(`[FINGERPRINT-DB] Warning: modelId ${modelId} not in expected list for ${manufacturerName}`);
    }
    return fp.driverId;
  }
  return null;
}

function getDPMapping(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  if (!fp || !fp.dps) {return {};}
  const simplified = {};
  for (const [dp, config] of Object.entries(fp.dps)) {
    if (typeof config === 'object' && config.capability) {
      simplified[dp] = config.capability;
    } else if (typeof config === 'string') {
      simplified[dp] = config;
    } else if (typeof config === 'object' && config.name) {
      simplified[dp] = config.name;
    }
  }
  return simplified;
}

function getEnrichedDPMapping(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  return fp ? fp.dps : {};
}

function isBatteryPowered(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  return fp ? fp.powerSource === 'battery' : null;
}

function getFingerprintsForDriver(driverId) {
  const db = _ensureLoaded();
  const result = [];
  for (const [mfr, fp] of Object.entries(db)) {
    if (fp.driverId === driverId) {
      result.push({ manufacturerName: mfr, ...fp });
    }
  }
  return result;
}

function getAllManufacturerNames() {
  return Object.keys(_ensureLoaded());
}

function setFingerprint(manufacturerName, fingerprint) {
  _ensureLoaded(); // Ensure initialized before mutation
  DEVICE_FINGERPRINTS[manufacturerName] = fingerprint;
  if (_lowercaseIndex) {
    _lowercaseIndex.set(manufacturerName.toLowerCase(), manufacturerName);
  }
}

function getCapabilities(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  return fp ? fp.capabilities : [];
}

function getClusters(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  return fp ? fp.clusters : [];
}

function getPowerInfo(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  if (!fp) {return null;}
  return { powerSource: fp.powerSource, batteryType: fp.batteryType || null };
}

function getZigbeeReporting(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  return fp ? fp.zigbeeReporting : null;
}

function findByModelId(modelId) {
  const db = _ensureLoaded();
  const modelLower = (modelId || '').toLowerCase();
  const results = [];
  for (const [mfr, fp] of Object.entries(db)) {
    if (fp.modelIds && fp.modelIds.some(m => m.toLowerCase() === modelLower)) {
      results.push({ manufacturerName: mfr, ...fp });
    }
  }
  return results;
}

function convertDPValue(manufacturerName, dpId, rawValue, modelId) {
  const fp = getFingerprint(manufacturerName, modelId);
  if (!fp || !fp.dps || !fp.dps[dpId]) {return rawValue;}
  const dpConfig = fp.dps[dpId];
  if (typeof dpConfig !== 'object') {return rawValue;}
  switch (dpConfig.converter) {
  case 'divideBy10': return typeof rawValue === 'number' ? rawValue / 10 : rawValue;
  case 'divideBy100': return typeof rawValue === 'number' ? rawValue / 100 : rawValue;
  case 'boolean': return Boolean(rawValue);
  case 'raw': default: return rawValue;
  }
}

function getStatistics() {
  const db = _ensureLoaded();
  const stats = { total: 0, byType: {}, byPowerSource: {}, byDriver: {} };
  for (const [mfr, fp] of Object.entries(db)) {
    stats.total++;
    stats.byType[fp.type] = (stats.byType[fp.type] || 0) + 1;
    stats.byPowerSource[fp.powerSource] = (stats.byPowerSource[fp.powerSource] || 0) + 1;
    stats.byDriver[fp.driverId] = (stats.byDriver[fp.driverId] || 0) + 1;
  }
  return stats;
}

module.exports = {
  get DEVICE_FINGERPRINTS() { return _ensureLoaded(); },
  _ensureLoaded,
  getFingerprint,
  getDriverId,
  getDPMapping,
  getEnrichedDPMapping,
  isBatteryPowered,
  getFingerprintsForDriver,
  getAllManufacturerNames,
  setFingerprint,
  getCapabilities,
  getClusters,
  getPowerInfo,
  getZigbeeReporting,
  findByModelId,
  convertDPValue,
  getStatistics
};
