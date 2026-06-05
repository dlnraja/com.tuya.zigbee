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
 * v9.9.0: LRU CACHE + MEMORY PRESSURE EVICTION via LazyJSONLoader.
 *         Fingerprints are served from a bounded LRU cache (max 2000 entries).
 *         When heap > 56MB, the full DB is evicted and rebuilt from LRU only.
 *
 * [ignoring loop detection]
 */

const fs   = require('fs');
const path = require('path');

// ── Optional LazyJSONLoader for LRU cache support ──────────────────────────
let LazyJSONLoader = null;
let _lazyLoader    = null;
try {
  LazyJSONLoader = require('../utils/LazyJSONLoader');
  _lazyLoader = new LazyJSONLoader('data/fingerprints.json', {
    maxEntries: 2000,
    keepAll:    true,
    label:      'FingerprintDB',
    extraPaths: ['/app', process.cwd()]
  });
} catch (e) {
  // LazyJSONLoader not available — fall back to legacy mode
}

// ── Legacy flat-load state (used when LazyJSONLoader is not available) ─────
let DEVICE_FINGERPRINTS = null;
let _loaded = false;
let _loadAttempted = false;
let _loading = false;

const FINGERPRINT_PATHS = [
  path.resolve(__dirname, '../../data/fingerprints.json'),
  path.resolve(__dirname, '../data/fingerprints.json'),
  path.resolve(__dirname, './fingerprints.json'),
  '/app/data/fingerprints.json',
  path.join(process.cwd(), 'data', 'fingerprints.json')
];

/**
 * Lazy-load the fingerprints database on first access.
 * Uses LazyJSONLoader (LRU + GC) when available, falls back to legacy mode.
 * Returns empty object if all paths fail (graceful degradation).
 */
function _ensureLoaded() {
  // ── Fast path: LazyJSONLoader handles everything ───────────────────────
  if (_lazyLoader) {
    try {
      const db = _lazyLoader.getAll();
      if (db && typeof db === 'object') return db;
    } catch (e) {
      console.error('[FingerprintDB] LazyJSONLoader error, falling back to legacy mode:', e.message);
      _lazyLoader = null; // Disable for this session
    }
  }

  // ── Legacy path ────────────────────────────────────────────────────────
  if (DEVICE_FINGERPRINTS !== null) return DEVICE_FINGERPRINTS;
  if (_loading) return {};
  _loading = true;
  _loadAttempted = true;

  if (typeof global.gc === 'function') { try { global.gc(); } catch (e) {} }

  for (const fpath of FINGERPRINT_PATHS) {
    try {
      if (fs.existsSync(fpath)) {
        let rawBuffer = fs.readFileSync(fpath);
        DEVICE_FINGERPRINTS = JSON.parse(rawBuffer);
        rawBuffer = null;
        if (typeof global.gc === 'function') { try { global.gc(); } catch (e) {} }
        const count = Object.keys(DEVICE_FINGERPRINTS).length;
        console.log(`[FingerprintDB] ✅ Legacy-loaded from: ${fpath} (${count} devices)`);
        _loaded = true;
        _loading = false;
        return DEVICE_FINGERPRINTS;
      }
    } catch (err) {
      console.error(`[FingerprintDB] ⚠️ ${fpath}: ${err.message}`);
    }
  }

  try {
    if (typeof global.gc === 'function') { try { global.gc(); } catch (e) {} }
    DEVICE_FINGERPRINTS = require('../../data/fingerprints.json');
    _loaded = true;
    console.log('[FingerprintDB] 🆘 Emergency require fallback succeeded.');
  } catch (e) {
    console.error('[FingerprintDB] 💀 All fingerprint sources unavailable. Running with EMPTY database.');
    DEVICE_FINGERPRINTS = {};
  }
  _loading = false;
  return DEVICE_FINGERPRINTS;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS — unchanged API surface
// ═══════════════════════════════════════════════════════════════════════════

function getFingerprint(manufacturerName, modelId) {
  const db = _ensureLoaded();
  const mfrLower = (manufacturerName || '').toLowerCase();
  const modelLower = (modelId || '').toLowerCase();
  
  if (modelId) {
    const compoundKey = `${mfrLower}|${modelLower}`;
    for (const [key, fp] of Object.entries(db)) {
      if (key.toLowerCase() === compoundKey) return fp;
    }
    for (const [key, fp] of Object.entries(db)) {
      if (key.toLowerCase().startsWith(`${mfrLower}|`)) {
        if (fp.modelIds && fp.modelIds.some(m => m.toLowerCase() === modelLower)) {
          return fp;
        }
      }
    }
    for (const [key, fp] of Object.entries(db)) {
      if (key.toLowerCase() === mfrLower) {
        if (fp.modelIds && fp.modelIds.some(m => m.toLowerCase() === modelLower)) {
          return fp;
        }
      }
    }
  }
  
  for (const [key, fp] of Object.entries(db)) {
    if (key.toLowerCase() === mfrLower) return fp;
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

function getDPMapping(manufacturerName) {
  const fp = getFingerprint(manufacturerName);
  if (!fp || !fp.dps) { return {}; }
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
    if (fp.driverId === driverId) result.push({ manufacturerName: mfr, ...fp });
  }
  return result;
}

function getAllManufacturerNames() {
  return Object.keys(_ensureLoaded());
}

function setFingerprint(manufacturerName, fingerprint) {
  _ensureLoaded();
  if (_lazyLoader) _lazyLoader.set(manufacturerName, fingerprint);
  if (DEVICE_FINGERPRINTS) DEVICE_FINGERPRINTS[manufacturerName] = fingerprint;
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
  if (!fp) { return null; }
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
  if (!fp || !fp.dps || !fp.dps[dpId]) { return rawValue; }
  const dpConfig = fp.dps[dpId];
  if (typeof dpConfig !== 'object') { return rawValue; }
  switch (dpConfig.converter) {
  case 'divideBy10':  return typeof rawValue === 'number' ? rawValue / 10 : rawValue;
  case 'divideBy100': return typeof rawValue === 'number' ? rawValue / 100 : rawValue;
  case 'boolean':     return Boolean(rawValue);
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

/**
 * v9.9.0: Memory pressure eviction — call when Homey reports low memory.
 * Releases the full DB from memory; LRU cache remains active.
 */
function evictForMemoryPressure() {
  if (_lazyLoader) {
    _lazyLoader.evict();
    console.log('[FingerprintDB] 🗑️ Evicted full DB from memory (LRU cache preserved)');
  } else if (DEVICE_FINGERPRINTS) {
    DEVICE_FINGERPRINTS = null;
    _loaded = false;
    if (typeof global.gc === 'function') { try { global.gc(); } catch (e) {} }
    console.log('[FingerprintDB] 🗑️ Evicted full DB from memory (legacy mode)');
  }
}

/**
 * v9.9.0: Stats for debugging memory usage.
 */
function getMemoryStats() {
  const heap = process.memoryUsage();
  return {
    heapUsedMB:  (heap.heapUsed  / 1024 / 1024).toFixed(1),
    heapTotalMB: (heap.heapTotal / 1024 / 1024).toFixed(1),
    rssMB:       (heap.rss       / 1024 / 1024).toFixed(1),
    lazyLoader:  _lazyLoader ? _lazyLoader.stats() : 'legacy mode',
    dbLoaded:    _loaded || (_lazyLoader ? _lazyLoader._loaded : false),
  };
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
  getStatistics,
  evictForMemoryPressure,
  getMemoryStats,
};
