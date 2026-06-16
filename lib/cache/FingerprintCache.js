'use strict';

/**
 * FingerprintCache.js - Fingerprint Lookup Cache
 *
 * Caches device fingerprint lookups for fast access. Automatically invalidates
 * when data/fingerprints.json changes on disk. Supports batch lookups and
 * tracks hit/miss ratio for performance monitoring.
 *
 * Fingerprint matching follows the project's core rule:
 *   manufacturerName + productId (COMBINED) must match.
 *
 * Usage:
 *   const fpCache = new FingerprintCache();
 *   const match = fpCache.lookup('_TZE200_', 'TS0601');
 *   const batch = fpCache.batchLookup([{mfr: '_TZE200_', pid: 'TS0601'}]);
 */

const fs = require('fs');
const path = require('path');
const SmartCache = require('./SmartCache');

class FingerprintCache {
  /**
   * @param {object} [options]
   * @param {string} [options.fingerprintsPath] - Path to fingerprints.json
   * @param {string} [options.composeDir] - Path to drivers directory (for compose.json scanning)
   * @param {number} [options.maxSize=5000] - Maximum cache entries
   * @param {number} [options.defaultTTL=600000] - Default TTL in ms (10 min)
   * @param {string} [options.cacheDir='.cache'] - Disk cache directory
   * @param {object} [options.logger=null] - Injectable logger
   * @param {boolean} [options.caseInsensitive=true] - Case-insensitive matching (project rule)
   */
  constructor(options = {}) {
    this._fingerprintsPath = options.fingerprintsPath || path.resolve('data', 'fingerprints.json');
    this._composeDir = options.composeDir || path.resolve('drivers');
    this._caseInsensitive = options.caseInsensitive !== false;
    this._logger = options.logger || null;

    this._cache = new SmartCache('fingerprints', {
      maxSize: options.maxSize || 5000,
      defaultTTL: options.defaultTTL || 600000, // 10 min
      cacheDir: options.cacheDir || '.cache',
      persistToDisk: true,
      logger: this._logger,
    });

    // Pre-loaded lookup indexes
    this._byMfr = new Map();    // manufacturerName -> [entry, ...]
    this._byMfrPid = new Map(); // "mfr|pid" -> entry
    this._lastFingerprintMtime = 0;
    this._lastComposeMtime = 0;

    // Statistics
    this._stats = {
      lookups: 0,
      hits: 0,
      misses: 0,
      batchLookups: 0,
      batchHits: 0,
      batchMisses: 0,
      rebuilds: 0,
      fileChangeInvalidations: 0,
    };

    // Initial build
    this._rebuildIndex();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Look up a device by manufacturerName and productId.
   * Returns the first matching entry or null.
   *
   * @param {string} manufacturerName
   * @param {string} productId
   * @returns {{driver: string, capabilities: object, entry: object}|null}
   */
  lookup(manufacturerName, productId) {
    this._stats.lookups++;

    if (!manufacturerName || !productId) {
      this._stats.misses++;
      return null;
    }

    // Check if fingerprint file changed since last build
    this._checkForChanges();

    // Normalize keys for case-insensitive matching
    const mfrKey = this._caseInsensitive
      ? manufacturerName.toLowerCase().trim()
      : manufacturerName.trim();
    const pidKey = this._caseInsensitive
      ? productId.toLowerCase().trim()
      : productId.trim();

    // Composite key lookup (fastest path)
    const compositeKey = `${mfrKey}|${pidKey}`;
    const cached = this._cache.get(compositeKey);
    if (cached !== undefined) {
      this._stats.hits++;
      return cached;
    }

    // Fallback to index lookup
    const entry = this._byMfrPid.get(compositeKey);
    if (entry) {
      this._cache.set(compositeKey, entry);
      this._stats.hits++;
      return entry;
    }

    this._stats.misses++;
    return null;
  }

  /**
   * Batch lookup for multiple devices.
   * Returns array of results in the same order as inputs.
   *
   * @param {Array<{manufacturerName: string, productId: string}>} devices
   * @returns {Array<{driver: string, capabilities: object, entry: object}|null>}
   */
  batchLookup(devices) {
    this._stats.batchLookups++;
    const results = [];

    for (const device of devices) {
      const result = this.lookup(device.manufacturerName, device.productId);
      results.push(result);
      if (result) {
        this._stats.batchHits++;
      } else {
        this._stats.batchMisses++;
      }
    }

    return results;
  }

  /**
   * Look up all entries matching a manufacturerName (multiple drivers).
   *
   * @param {string} manufacturerName
   * @returns {Array<{driver: string, capabilities: object, entry: object}>}
   */
  lookupByManufacturer(manufacturerName) {
    if (!manufacturerName) return [];

    this._checkForChanges();

    const mfrKey = this._caseInsensitive
      ? manufacturerName.toLowerCase().trim()
      : manufacturerName.trim();

    return this._byMfr.get(mfrKey) || [];
  }

  /**
   * Add a fingerprint entry at runtime.
   *
   * @param {object} entry - { manufacturerName, productId, driver, capabilities }
   */
  addEntry(entry) {
    if (!entry || !entry.manufacturerName || !entry.productId) return;

    const mfrKey = this._caseInsensitive
      ? entry.manufacturerName.toLowerCase().trim()
      : entry.manufacturerName.trim();
    const pidKey = this._caseInsensitive
      ? entry.productId.toLowerCase().trim()
      : entry.productId.trim();
    const compositeKey = `${mfrKey}|${pidKey}`;

    // Update indexes
    if (!this._byMfr.has(mfrKey)) {
      this._byMfr.set(mfrKey, []);
    }
    this._byMfr.get(mfrKey).push(entry);
    this._byMfrPid.set(compositeKey, entry);

    // Update cache
    this._cache.set(compositeKey, entry);
  }

  /**
   * Force rebuild of the lookup index.
   */
  rebuild() {
    this._rebuildIndex();
  }

  /**
   * Get cache statistics.
   * @returns {object}
   */
  stats() {
    const totalLookups = this._stats.lookups;
    const totalBatch = this._stats.batchLookups;
    return {
      ...this._stats,
      lookupHitRate: totalLookups > 0
        ? (this._stats.hits / totalLookups * 100).toFixed(1) + '%'
        : '0%',
      batchHitRate: totalBatch > 0
        ? (this._stats.batchHits / (this._stats.batchHits + this._stats.batchMisses) * 100).toFixed(1) + '%'
        : '0%',
      indexSize: this._byMfrPid.size,
      manufacturerCount: this._byMfr.size,
      smartCacheStats: this._cache.stats(),
    };
  }

  /**
   * Invalidate all cached entries.
   */
  invalidateAll() {
    this._cache.clear();
    this._stats.fileChangeInvalidations++;
  }

  /**
   * Flush cache to disk.
   */
  flush() {
    this._cache.flush();
  }

  /**
   * Destroy the cache.
   */
  destroy() {
    this._cache.destroy();
    this._byMfr.clear();
    this._byMfrPid.clear();
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _rebuildIndex() {
    this._byMfr.clear();
    this._byMfrPid.clear();

    // 1. Load from data/fingerprints.json if it exists and has content
    this._loadFromFileFingerprints();

    // 2. Load from driver compose.json files
    this._loadFromComposeFiles();

    // Record mtimes for change detection
    this._lastFingerprintMtime = this._getMtime(this._fingerprintsPath);
    this._lastComposeMtime = this._getDirMtime(this._composeDir);

    this._stats.rebuilds++;
  }

  _loadFromFileFingerprints() {
    try {
      if (!fs.existsSync(this._fingerprintsPath)) return;

      const raw = fs.readFileSync(this._fingerprintsPath);
      const data = JSON.parse(raw);

      if (!data || typeof data !== 'object') return;

      // fingerprints.json format: { "driverType": [ { manufacturerName, productId, ... }, ... ] }
      for (const [driverType, entries] of Object.entries(data)) {
        if (!Array.isArray(entries)) continue;
        for (const entry of entries) {
          if (!entry.manufacturerName || !entry.productId) continue;
          this._addEntryInternal(driverType, entry);
        }
      }
    } catch (_e) {
      // Non-fatal: fingerprints.json may not exist or be parseable
    }
  }

  _loadFromComposeFiles() {
    try {
      if (!fs.existsSync(this._composeDir)) return;

      const driverDirs = fs.readdirSync(this._composeDir).filter((d) => {
        try {
          return fs.statSync(path.join(this._composeDir, d)).isDirectory();
        } catch (_e) {
          return false;
        }
      });

      for (const driverDir of driverDirs) {
        const composePath = path.join(this._composeDir, driverDir, 'driver.compose.json');
        if (!fs.existsSync(composePath)) continue;

        try {
          const raw = fs.readFileSync(composePath);
          const data = JSON.parse(raw);
          const manufacturers = data.zigbee?.manufacturerName || [];
          const products = data.zigbee?.productId || [];

          for (const mfr of manufacturers) {
            for (const pid of products) {
              this._addEntryInternal(driverDir, { manufacturerName: mfr, productId: pid });
            }
          }

          // Also handle single productId entries
          if (manufacturers.length > 0 && products.length === 0) {
            for (const mfr of manufacturers) {
              this._addEntryInternal(driverDir, { manufacturerName: mfr, productId: '*' });
            }
          }
        } catch (_e) {
          // Skip malformed compose files
        }
      }
    } catch (_e) {
      // Non-fatal
    }
  }

  _addEntryInternal(driver, entry) {
    const mfrKey = this._caseInsensitive
      ? entry.manufacturerName.toLowerCase().trim()
      : entry.manufacturerName.trim();
    const pidKey = this._caseInsensitive
      ? entry.productId.toLowerCase().trim()
      : entry.productId.trim();
    const compositeKey = `${mfrKey}|${pidKey}`;

    const fullEntry = {
      driver,
      manufacturerName: entry.manufacturerName,
      productId: entry.productId,
      capabilities: entry.capabilities || {},
      entry,
    };

    // Update indexes (allow multiple drivers per manufacturer)
    if (!this._byMfr.has(mfrKey)) {
      this._byMfr.set(mfrKey, []);
    }
    this._byMfr.get(mfrKey).push(fullEntry);

    // For composite key, first match wins (consistent with driver matching)
    if (!this._byMfrPid.has(compositeKey)) {
      this._byMfrPid.set(compositeKey, fullEntry);
    }
  }

  _checkForChanges() {
    const fpMtime = this._getMtime(this._fingerprintsPath);
    const compMtime = this._getDirMtime(this._composeDir);

    if (fpMtime !== this._lastFingerprintMtime || compMtime !== this._lastComposeMtime) {
      this._rebuildIndex();
      this.invalidateAll();
    }
  }

  _getMtime(filePath) {
    try {
      return fs.statSync(filePath).mtimeMs;
    } catch (_e) {
      return 0;
    }
  }

  _getDirMtime(dirPath) {
    try {
      const stat = fs.statSync(dirPath);
      return stat.mtimeMs;
    } catch (_e) {
      return 0;
    }
  }
}

module.exports = FingerprintCache;
