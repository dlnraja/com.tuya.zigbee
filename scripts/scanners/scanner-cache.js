#!/usr/bin/env node
/**
 * Scanner Cache Manager v1.0.0
 * ==========================================================================
 * Provides intelligent caching for all 8 external scanners with:
 * - TTL-based expiry per source (volatile vs stable sources)
 * - SHA-256 hash change detection
 * - Cache statistics tracking
 * - Automatic invalidation
 * - Fallback to stale cache on network errors
 *
 * Usage (as module):
 *   const ScannerCache = require('./scanner-cache');
 *   const cache = new ScannerCache('tinytuya');
 *   if (await cache.isValid()) { return cache.load(); }
 *   const data = await fetchAndParse();
 *   await cache.save(data);
 *
 * Usage (CLI):
 *   node scripts/scanners/scanner-cache.js --status
 *   node scripts/scanners/scanner-cache.js --invalidate=tinytuya
 *   node scripts/scanners/scanner-cache.js --invalidate-all
 *   node scripts/scanners/scanner-cache.js --stats
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REPO_ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(REPO_ROOT, '.cache', 'scanners');
const CACHE_INDEX = path.join(CACHE_DIR, '_cache-index.json');
const CACHE_STATS = path.join(CACHE_DIR, '_cache-stats.json');

// ── Scanner Definitions (TTLs in milliseconds) ────────────────────────────
// Volatile sources (change frequently): 12h
// Standard sources: 24h
// Stable sources (rarely change): 48h-7d
const SCANNER_CONFIG = {
  tinytuya: {
    name: 'TinyTuya',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'tinytuya-results.json',
    ttl: 24 * 60 * 60 * 1000,    // 24 hours
    volatility: 'standard',
    description: 'jasonacox/tinytuya DP type definitions',
  },
  'tuya-local': {
    name: 'Tuya-Local',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'tuya-local-results.json',
    ttl: 24 * 60 * 60 * 1000,    // 24 hours
    volatility: 'standard',
    description: 'make-all/tuya-local YAML configs',
  },
  hubitat: {
    name: 'Hubitat',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'hubitat-results.json',
    ttl: 12 * 60 * 60 * 1000,    // 12 hours (community-driven, changes often)
    volatility: 'volatile',
    description: 'Hubitat Groovy Tuya drivers',
  },
  smartthings: {
    name: 'SmartThings',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'smartthings-results.json',
    ttl: 12 * 60 * 60 * 1000,    // 12 hours (community-driven)
    volatility: 'volatile',
    description: 'SmartThings Edge fingerprint files',
  },
  openhab: {
    name: 'openHAB',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'openhab-results.json',
    ttl: 48 * 60 * 60 * 1000,    // 48 hours (stable upstream)
    volatility: 'stable',
    description: 'openHAB Zigbee XML thing definitions',
  },
  domoticz: {
    name: 'Domoticz',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'domoticz-results.json',
    ttl: 48 * 60 * 60 * 1000,    // 48 hours (stable upstream)
    volatility: 'stable',
    description: 'Domoticz Zigbee Lua/Python plugins',
  },
  'xiaomi-miot': {
    name: 'Xiaomi MIoT',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'xiaomi-miot-results.json',
    ttl: 24 * 60 * 60 * 1000,    // 24 hours
    volatility: 'standard',
    description: 'miot-spec.org + Z2M Lumi fingerprints',
  },
  'csa-iot': {
    name: 'CSA-IoT',
    outputDir: path.join(REPO_ROOT, 'data', 'scanners'),
    outputFile: 'csa-iot-results.json',
    ttl: 7 * 24 * 60 * 60 * 1000, // 7 days (certification data is slow-changing)
    volatility: 'very-stable',
    description: 'CSA certified Zigbee products',
  },
};

// ── Colours ───────────────────────────────────────────────────────────────
const C = {
  G: '\x1b[32m', Y: '\x1b[33m', R: '\x1b[31m', B: '\x1b[34m',
  M: '\x1b[35m', D: '\x1b[90m', X: '\x1b[0m', W: '\x1b[1m',
};
const log = (c, ...a) => console.log(`${c}[SCANNER-CACHE]${C.X} ${a.join(' ')}`);

// ── CLI arguments ─────────────────────────────────────────────────────────
const ARGS = process.argv.slice(2);
const FLAG = (name) => ARGS.some(a => a === `--${name}`);
const OPT = (name) => {
  const a = ARGS.find(x => x.startsWith(`--${name}=`));
  return a ? a.split('=').slice(1).join('=') : null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE INDEX MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function loadIndex() {
  try {
    if (fs.existsSync(CACHE_INDEX)) {
      return JSON.parse(fs.readFileSync(CACHE_INDEX));
    }
  } catch { /* ignore */ }
  return {};
}

function saveIndex(index) {
  ensureCacheDir();
  fs.writeFileSync(CACHE_INDEX, JSON.stringify(index, null, 2));
}

function loadStats() {
  try {
    if (fs.existsSync(CACHE_STATS)) {
      return JSON.parse(fs.readFileSync(CACHE_STATS));
    }
  } catch { /* ignore */ }
  return { hits: {}, misses: {}, saves: {}, errors: {}, totalHits: 0, totalMisses: 0 };
}

function saveStats(stats) {
  ensureCacheDir();
  fs.writeFileSync(CACHE_STATS, JSON.stringify(stats, null, 2));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HASH COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

function computeHash(data) {
  const content = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(content).digest('hex');
}

function computeFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER CACHE CLASS
// ═══════════════════════════════════════════════════════════════════════════════

class ScannerCache {
  /**
   * @param {string} scannerId - One of the keys in SCANNER_CONFIG
   */
  constructor(scannerId) {
    const config = SCANNER_CONFIG[scannerId];
    if (!config) {
      throw new Error(`Unknown scanner: ${scannerId}. Valid: ${Object.keys(SCANNER_CONFIG).join(', ')}`);
    }
    this.id = scannerId;
    this.config = config;
    this.cachePath = path.join(CACHE_DIR, `${scannerId}.json`);
    this.outputPath = path.join(config.outputDir, config.outputFile);
  }

  /**
   * Check if the cache is still valid (not expired and data exists).
   * @returns {boolean}
   */
  isValid() {
    const index = loadIndex();
    const entry = index[this.id];
    if (!entry) return false;

    const age = Date.now() - new Date(entry.savedAt).getTime();
    if (age > this.config.ttl) return false;

    // Verify cache file exists
    if (!fs.existsSync(this.cachePath)) return false;

    return true;
  }

  /**
   * Get cache age in human-readable format.
   * @returns {string}
   */
  getAge() {
    const index = loadIndex();
    const entry = index[this.id];
    if (!entry) return 'NEVER CACHED';
    const age = Date.now() - new Date(entry.savedAt).getTime();
    if (age < 60000) return `${(age / 1000).toFixed(1)}s`;
    if (age < 3600000) return `${(age / 60000).toFixed(1)}min`;
    if (age < 86400000) return `${(age / 3600000).toFixed(1)}h`;
    return `${(age / 86400000).toFixed(1)}d`;
  }

  /**
   * Get remaining TTL in milliseconds.
   * @returns {number} ms until expiry (0 = expired)
   */
  getRemainingTTL() {
    const index = loadIndex();
    const entry = index[this.id];
    if (!entry) return 0;
    const age = Date.now() - new Date(entry.savedAt).getTime();
    return Math.max(0, this.config.ttl - age);
  }

  /**
   * Load data from cache.
   * @returns {object|null} Cached data or null
   */
  load() {
    const stats = loadStats();
    try {
      if (!fs.existsSync(this.cachePath)) {
        stats.misses[this.id] = (stats.misses[this.id] || 0) + 1;
        stats.totalMisses++;
        saveStats(stats);
        return null;
      }
      const data = JSON.parse(fs.readFileSync(this.cachePath));
      stats.hits[this.id] = (stats.hits[this.id] || 0) + 1;
      stats.totalHits++;
      saveStats(stats);
      return data;
    } catch {
      stats.misses[this.id] = (stats.misses[this.id] || 0) + 1;
      stats.totalMisses++;
      saveStats(stats);
      return null;
    }
  }

  /**
   * Save data to cache.
   * @param {object} data - Scanner output data
   * @param {string} [sourceHash] - Optional hash of the source data for change detection
   */
  save(data, sourceHash = null) {
    ensureCacheDir();
    const stats = loadStats();
    const hash = sourceHash || computeHash(data);

    // Write cache file
    fs.writeFileSync(this.cachePath, JSON.stringify(data, null, 2));

    // Update index
    const index = loadIndex();
    index[this.id] = {
      savedAt: new Date().toISOString(),
      hash,
      dataLength: JSON.stringify(data).length,
      itemCount: this._countItems(data),
      ttl: this.config.ttl,
      volatility: this.config.volatility,
    };
    saveIndex(index);

    // Update stats
    stats.saves[this.id] = (stats.saves[this.id] || 0) + 1;
    saveStats(stats);

    // Also update the output file if data directory exists
    if (fs.existsSync(this.config.outputDir)) {
      fs.writeFileSync(this.outputPath, JSON.stringify(data, null, 2));
    }
  }

  /**
   * Check if source data has changed since last cache.
   * @param {string} currentHash - Current source hash
   * @returns {boolean} true if changed
   */
  hasChanged(currentHash) {
    const index = loadIndex();
    const entry = index[this.id];
    if (!entry) return true;
    return entry.hash !== currentHash;
  }

  /**
   * Invalidate (clear) the cache for this scanner.
   */
  invalidate() {
    // Remove cache file
    if (fs.existsSync(this.cachePath)) {
      fs.unlinkSync(this.cachePath);
    }
    // Remove from index
    const index = loadIndex();
    delete index[this.id];
    saveIndex(index);
  }

  /**
   * Get cache metadata.
   * @returns {object}
   */
  getMeta() {
    const index = loadIndex();
    const entry = index[this.id] || {};
    return {
      id: this.id,
      name: this.config.name,
      description: this.config.description,
      volatility: this.config.volatility,
      ttlMs: this.config.ttl,
      ttlHuman: this._formatTTL(this.config.ttl),
      savedAt: entry.savedAt || null,
      age: this.getAge(),
      remainingMs: this.getRemainingTTL(),
      remainingHuman: this._formatTTL(this.getRemainingTTL()),
      hash: entry.hash || null,
      dataLength: entry.dataLength || 0,
      itemCount: entry.itemCount || 0,
      isValid: this.isValid(),
      cacheFile: this.cachePath,
    };
  }

  // ── Private helpers ─────────────────────────────────────────────────────
  _countItems(data) {
    if (!data) return 0;
    if (Array.isArray(data)) return data.length;
    if (data.summary) return Object.values(data.summary).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    return 0;
  }

  _formatTTL(ms) {
    if (ms === 0) return 'EXPIRED';
    if (ms < 3600000) return `${(ms / 60000).toFixed(0)}min`;
    if (ms < 86400000) return `${(ms / 3600000).toFixed(0)}h`;
    return `${(ms / 86400000).toFixed(0)}d`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

function getAllCacheStatus() {
  const results = [];
  for (const id of Object.keys(SCANNER_CONFIG)) {
    const cache = new ScannerCache(id);
    results.push(cache.getMeta());
  }
  return results;
}

function invalidateAll() {
  for (const id of Object.keys(SCANNER_CONFIG)) {
    const cache = new ScannerCache(id);
    cache.invalidate();
  }
}

function getOverallStats() {
  const stats = loadStats();
  const index = loadIndex();
  const totalCacheSize = Object.keys(index).reduce((sum, id) => {
    return sum + (index[id].dataLength || 0);
  }, 0);

  return {
    scanners: Object.keys(SCANNER_CONFIG).length,
    cached: Object.keys(index).length,
    totalCacheSizeBytes: totalCacheSize,
    totalCacheSizeHuman: `${(totalCacheSize / 1024).toFixed(1)}KB`,
    hits: stats.totalHits,
    misses: stats.totalMisses,
    hitRate: stats.totalHits + stats.totalMisses > 0
      ? `${((stats.totalHits / (stats.totalHits + stats.totalMisses)) * 100).toFixed(1)}%`
      : 'N/A',
    perScanner: Object.keys(SCANNER_CONFIG).map(id => ({
      id,
      name: SCANNER_CONFIG[id].name,
      hits: stats.hits[id] || 0,
      misses: stats.misses[id] || 0,
      saves: stats.saves[id] || 0,
      errors: stats.errors[id] || 0,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI DISPLAY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function showStatus() {
  const statuses = getAllCacheStatus();
  const stats = getOverallStats();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  SCANNER CACHE STATUS`);
  console.log(`${'='.repeat(70)}\n`);

  for (const s of statuses) {
    const validIcon = s.isValid ? `${C.G}VALID` : `${C.R}EXPIRED`;
    console.log(`  ${validIcon}${C.X}  ${s.name.padEnd(18)} (${s.volatility}, TTL: ${s.ttlHuman})`);
    console.log(`       Age: ${s.age} | Remaining: ${s.remainingHuman} | Items: ${s.itemCount}`);
    console.log(`       ${C.D}${s.description}${C.X}`);
    console.log('');
  }

  console.log('  Overall Statistics:');
  console.log('  ' + '-'.repeat(66));
  console.log(`  Cached:     ${stats.cached}/${stats.scanners}`);
  console.log(`  Cache size: ${stats.totalCacheSizeHuman}`);
  console.log(`  Hit rate:   ${stats.hitRate} (${stats.hits} hits, ${stats.misses} misses)`);
  console.log('');
}

function showStats() {
  const stats = getOverallStats();

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  SCANNER CACHE STATISTICS`);
  console.log(`${'='.repeat(70)}\n`);

  for (const s of stats.perScanner) {
    console.log(`  ${s.name.padEnd(18)} | Hits: ${String(s.hits).padStart(4)} | Misses: ${String(s.misses).padStart(4)} | Saves: ${String(s.saves).padStart(4)} | Errors: ${String(s.errors).padStart(3)}`);
  }

  console.log(`\n  Total hit rate: ${stats.hitRate}`);
  console.log(`  Total cache size: ${stats.totalCacheSizeHuman}`);
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION HELPER: Check if scanner needs to run
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a scanner needs to run (cache expired or missing).
 * Used by scheduler.js to skip scanners that are still fresh.
 *
 * @param {string} scannerId
 * @returns {boolean} true if scanner should run
 */
function needsRefresh(scannerId) {
  const cache = new ScannerCache(scannerId);
  return !cache.isValid();
}

/**
 * Get list of scanner IDs that need refresh.
 * @returns {string[]}
 */
function getStaleScanners() {
  return Object.keys(SCANNER_CONFIG).filter(id => needsRefresh(id));
}

/**
 * Get list of scanner IDs that are still fresh.
 * @returns {string[]}
 */
function getFreshScanners() {
  return Object.keys(SCANNER_CONFIG).filter(id => !needsRefresh(id));
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════════

function cli() {
  if (FLAG('status')) {
    showStatus();
    return;
  }

  if (FLAG('stats')) {
    showStats();
    return;
  }

  const invalidateTarget = OPT('invalidate');
  if (invalidateTarget === 'all') {
    invalidateAll();
    log(C.Y, 'All scanner caches invalidated.');
    return;
  }
  if (invalidateTarget) {
    const cache = new ScannerCache(invalidateTarget);
    cache.invalidate();
    log(C.Y, `Cache invalidated for: ${invalidateTarget}`);
    return;
  }

  // Default: show usage
  showStatus();
  console.log('Usage:');
  console.log('  node scanner-cache.js --status              Show cache status for all scanners');
  console.log('  node scanner-cache.js --stats               Show cache hit/miss statistics');
  console.log('  node scanner-cache.js --invalidate=<id>     Invalidate one scanner cache');
  console.log('  node scanner-cache.js --invalidate=all      Invalidate all scanner caches');
}

// ── Exports ───────────────────────────────────────────────────────────────
module.exports = {
  ScannerCache,
  SCANNER_CONFIG,
  getAllCacheStatus,
  getOverallStats,
  invalidateAll,
  needsRefresh,
  getStaleScanners,
  getFreshScanners,
  computeHash,
};

if (require.main === module) {
  cli();
}
