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

const FINGERPRINT_PATHS = [
  path.resolve(__dirname, '../../data/fingerprints.json'), // Recommended: Root data/
  path.resolve(__dirname, '../data/fingerprints.json'),    // Fallback 1
  path.resolve(__dirname, './fingerprints.json'),          // Fallback 2: Local
  '/app/data/fingerprints.json',                           // Fallback 3: Absolute Homey
  path.join(process.cwd(), 'data', 'fingerprints.json')    // Fallback 4: CWD
];

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

  for (const fpath of FINGERPRINT_PATHS) {
    try {
      if (fs.existsSync(fpath)) {
        // Optimization: Read as raw Buffer (external C++ memory) instead of UTF-16 JavaScript string.
        // Natively JSON.parse parses Buffers in Node.js, which cuts heap memory footprint in half.
        let rawBuffer = fs.readFileSync(fpath);
        DEVICE_FINGERPRINTS = JSON.parse(rawBuffer);
        rawBuffer = null; // Instantly release external buffer reference

        // Run GC after loading if exposed to clean up transient allocation fragments
        if (typeof global.gc === 'function') {
          try { global.gc(); } catch (e) {}
        }

        const count = Object.keys(DEVICE_FINGERPRINTS).length;
        console.log(`[FingerprintDB] ✅ Lazy-loaded and GC-optimized from: ${fpath} (${count} devices)`);
        _loaded = true;
        _loading = false;
        return DEVICE_FINGERPRINTS;
      }
    } catch (err) {
      console.error(`[FingerprintDB] ⚠️ Failed to load memory-optimized fingerprints at ${fpath}: ${err.message}`);
    }
  }

  // All paths failed — try require fallback
  try {
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (e) {}
    }
    DEVICE_FINGERPRINTS = require('../../data/fingerprints.json');
    _loaded = true;
    console.log('[FingerprintDB] 🆘 Emergency require fallback succeeded.');
  } catch (e) {
    console.error('[FingerprintDB] 💀 All fingerprint sources unavailable. Running with EMPTY database due to OOM/crashes.');
    DEVICE_FINGERPRINTS = {};
  }
  _loading = false;
  return DEVICE_FINGERPRINTS;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getFingerprint(manufacturerName) {
  // Case-insensitive lookup
  const db = _ensureLoaded();
  const mfrLower = (manufacturerName || '').toLowerCase();
  for (const [key, fp] of Object.entries(db)) {
    if (key.toLowerCase() === mfrLower) {
      return fp;
    }
  }
  return null;
}

function getDriverId(manufacturerName, modelId) {
  const fp = getFingerprint(manufacturerName);
  if (fp) {
    const modelLower = (modelId || '').toLowerCase();
    if (modelId && fp.modelIds && !fp.modelIds.some(m => m.toLowerCase() === modelLower)) {
      console.log(`[FINGERPRINT-DB] Warning: modelId ${modelId} not in expected list for ${manufacturerName}`);
    }
    return fp.driverId;
  }
  return null;
}

function getDPMapping(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
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

function getEnrichedDPMapping(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.dps : {};
}

function isBatteryPowered(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
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
}

function getCapabilities(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.capabilities : [];
}

function getClusters(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  return fp ? fp.clusters : [];
}

function getPowerInfo(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  if (!fp) {return null;}
  return { powerSource: fp.powerSource, batteryType: fp.batteryType || null };
}

function getZigbeeReporting(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
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

function convertDPValue(manufacturerName, dpId, rawValue) {
  const fp = getFingerprint(manufacturerName);
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
