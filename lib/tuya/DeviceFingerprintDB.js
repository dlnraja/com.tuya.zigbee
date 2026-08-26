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
const TU = require('../utils/TuyaNormalizer');
const FingerprintMatcher = require('../utils/fingerprint-matcher'); // P92 heuristic matching

// P92: heuristic fallback can be disabled (TUYA_FP_HEURISTIC=0) to restore
// the pre-P92 exact/case-insensitive-only behavior.
const HEURISTIC_ENABLED = process.env.TUYA_FP_HEURISTIC !== '0';

/**
 * v9.8.0: Lazy-Loading Fingerprint Database
 * Defers JSON parsing until first API call to prevent OOM at startup.
 */
let DEVICE_FINGERPRINTS = null; // null = not loaded yet
let _loaded = false;
let _loadAttempted = false;
let _loading = false;

// v9.0.35: O(1) lookup cache — maps lowercased manufacturerName -> original key
// Built once after lazy-loading; eliminates O(n) linear scan per getFingerprint() call.
let _lowercaseIndex = null;
let _compoundDb = null;

// v9.8.1: Merged case-insensitive fingerprint cache.
// When the same normalized manufacturer appears with different casing and/or
// divergent data, we merge modelIds / DPs and keep the richest entry rather
// than letting the last key overwrite the first one.
let _mergedFingerprints = null;

const FINGERPRINT_PATHS = [
  path.resolve(__dirname, './fingerprints.json'),          // Broad bundled catalog
  path.resolve(__dirname, '../data/fingerprints.json'),    // Bundled lib/data override
  path.resolve(__dirname, '../../data/fingerprints.json'), // Root curated override
  path.join(process.cwd(), 'data', 'fingerprints.json'),   // CWD override
  '/app/data/fingerprints.json'                            // Absolute Homey override
];

function _getCompoundDb() {
  if (_compoundDb !== null) {return _compoundDb;}
  try {
    _compoundDb = require('../DeviceFingerprintDB');
  } catch (err) {
    _compoundDb = false;
  }
  return _compoundDb || null;
}

function _readFingerprintSource(fpath) {
  if (!fs.existsSync(fpath)) {return null;}
  let rawBuffer = fs.readFileSync(fpath);
  try {
    const data = JSON.parse(rawBuffer);
    rawBuffer = null;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {return null;}
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
    if (seen.has(resolved)) {continue;}
    seen.add(resolved);

    try {
      const data = _readFingerprintSource(resolved);
      if (!data) {continue;}
      Object.assign(merged, data);
    } catch (err) {
// console.error(`[FingerprintDB] Failed to load fingerprints at ${resolved}: ${err.message}`);
    }
  }

  return merged;
}

/**
 * Lazy-load the fingerprints database on first access.
 * Returns empty object if all paths fail (graceful degradation).
 */
function _ensureLoaded() {
  if (DEVICE_FINGERPRINTS !== null) {return DEVICE_FINGERPRINTS;}
  if (_loading) {return {};} // Prevent re-entrant loading
  _loading = true;
  _loadAttempted = true;

  // Run GC before loading if exposed
  if (typeof global.gc === 'function') {
    try { global.gc(); } catch (e) { /* best-effort GC */ }
  }

  DEVICE_FINGERPRINTS = _loadMergedFingerprintSources();
  if (Object.keys(DEVICE_FINGERPRINTS).length > 0) {
    _buildLowercaseIndex();
    _loaded = true;
    _loading = false;
    return DEVICE_FINGERPRINTS;
  }

  // All paths failed — try require fallback
  try {
    if (typeof global.gc === 'function') {
      try { global.gc(); } catch (e) { /* best-effort GC */ }
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
  if (!dpMap || typeof dpMap !== 'object') {return undefined;}
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
  if (!manufacturerName || !modelId) {return null;}
  const compoundDb = _getCompoundDb();
  if (!compoundDb?.lookup) {return null;}

  const profile = compoundDb.lookup(manufacturerName, modelId);
  if (!profile?.driver || !['exact', 'exact_ci'].includes(profile.matchType)) {return null;}

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

/**
 * Merge two fingerprint entries that resolve to the same normalized
 * manufacturerName. Keeps the richest metadata and unions modelIds / DPs.
 */
function _mergeFingerprintEntries(base, incoming, baseKey, incomingKey) {
  if (!base) {return incoming;}
  if (!incoming) {return base;}

  const merged = { ...base };

  // Union modelIds
  const modelIds = new Set([
    ...Array.isArray(base.modelIds) ? base.modelIds : [],
    ...Array.isArray(incoming.modelIds) ? incoming.modelIds : [],
  ]);
  if (modelIds.size > 0) {merged.modelIds = [...modelIds];}

  // Merge DPs if present
  if (incoming.dps && typeof incoming.dps === 'object') {
    merged.dps = { ...base.dps || {}, ...incoming.dps };
  }

  // Prefer the more informative powerSource
  const powerRank = { battery: 3, mains: 2, unknown: 1 };
  const baseRank = powerRank[base.powerSource] || 0;
  const incomingRank = powerRank[incoming.powerSource] || 0;
  if (incomingRank > baseRank) {merged.powerSource = incoming.powerSource;}

  // Prefer a concrete type over a generic/needs-assignment placeholder
  if (incoming.type && incoming.type.includes('needs_device_assignment') === false
      && (!merged.type || merged.type.includes('needs_device_assignment'))) {
    merged.type = incoming.type;
  }

  // Track merge provenance
  merged._mergeSources = Array.from(new Set([
    ...base._mergeSources || [baseKey],
    incomingKey,
  ]));

  return merged;
}

/**
 * v9.0.35: Build lowercase -> original key index for O(1) lookups.
 * v9.8.1: Also build a merged case-insensitive fingerprint cache so that
 * divergent casing (e.g. _TZE284_hodyryli vs _TZE284_HODYRYLI) does not
 * silently overwrite data.
 * Called once after lazy-loading; replaces O(n) linear scan.
 * P89: Use TuyaNormalizer (NFKD + accents + lowercase + snake-case).
 */
function _buildLowercaseIndex() {
  _lowercaseIndex = new Map();
  _mergedFingerprints = {};
  if (DEVICE_FINGERPRINTS && typeof DEVICE_FINGERPRINTS === 'object') {
    for (const key of Object.keys(DEVICE_FINGERPRINTS)) {
      const normalized = TU.normalize(key);
      const existingKey = _lowercaseIndex.get(normalized);
      if (existingKey) {
        _mergedFingerprints[normalized] = _mergeFingerprintEntries(
          _mergedFingerprints[normalized] || DEVICE_FINGERPRINTS[existingKey],
          DEVICE_FINGERPRINTS[key],
          existingKey,
          key,
        );
      } else {
        _lowercaseIndex.set(normalized, key);
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getFingerprint(manufacturerName, modelId) {
  const compound = _lookupCompoundFingerprint(manufacturerName, modelId);
  if (compound) {
    const fallback = getFingerprint(manufacturerName);
    return { ...fallback || {}, ...compound };
  }

  const db = _ensureLoaded();
  const mfrLower = TU.normalize(manufacturerName || '');

  // v9.8.1: Use merged fingerprint when divergent case variants exist.
  if (_mergedFingerprints && _mergedFingerprints[mfrLower]) {
    const canonicalKey = _lowercaseIndex.get(mfrLower);
    const base = canonicalKey ? db[canonicalKey] : {};
    return { ...base, ..._mergedFingerprints[mfrLower] };
  }

  // O(1) lookup via pre-built index (v9.0.35)
  if (_lowercaseIndex) {
    const originalKey = _lowercaseIndex.get(mfrLower);
    if (originalKey) {return db[originalKey];}

    // v9.9.0 (P92): Heuristic fallback — interchangeable TZE prefixes,
    // parasite-tolerant normalization, fuzzy suffix (edit distance <= 2).
    // Runs only after every exact / case-insensitive path missed.
    if (HEURISTIC_ENABLED) {
      const match = FingerprintMatcher.matchFingerprint(manufacturerName, modelId, db);
      if (match && match.entry) {
        return {
          ...match.entry,
          matchType: match.matchType,
          _matchScore: match.score,
          _matchedKey: match.key,
        };
      }
    }
    return null;
  }
  // Fallback: O(n) scan if index not built (should not happen)
  for (const [key, fp] of Object.entries(db)) {
    if (TU.normalize(key) === mfrLower) {
      return fp;
    }
  }
  return null;
}

function getDriverId(manufacturerName, modelId) {
  // Sacred couple: compound (mfr|pid) always wins when present.
  const compound = _lookupCompoundFingerprint(manufacturerName, modelId);
  if (compound?.driverId) {return compound.driverId;}

  // Mfr-only catalog is ambiguous — one manufacturer can ship many productIds /
  // device names / variants. Only accept when pid is absent OR listed in modelIds.
  const fp = getFingerprint(manufacturerName);
  if (!fp?.driverId) {return null;}
  if (modelId && Array.isArray(fp.modelIds) && fp.modelIds.length > 0) {
    const modelLower = TU.normalize(modelId);
    const listed = fp.modelIds.some((m) => TU.normalize(m) === modelLower);
    if (!listed) {return null;}
  }
  return fp.driverId;
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
  // Rebuild index to include new entry
  if (_lowercaseIndex) {
    _lowercaseIndex.set(TU.normalize(manufacturerName), manufacturerName);
  }
  // P92: drop the heuristic matcher's cached index for this db object
  FingerprintMatcher.invalidateIndex(DEVICE_FINGERPRINTS);
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
  const modelLower = TU.normalize(modelId || '');
  const results = [];
  for (const [mfr, fp] of Object.entries(db)) {
    if (fp.modelIds && fp.modelIds.some(m => TU.normalize(m) === modelLower)) {
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
