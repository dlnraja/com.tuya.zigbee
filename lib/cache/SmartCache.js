'use strict';

/**
 * SmartCache.js - LRU + TTL Cache with Disk Persistence
 *
 * Implements a Least Recently Used (LRU) eviction strategy with per-entry
 * Time To Live (TTL) support. Persists cache to disk in .cache/ directory
 * for fast startup recovery. Logs cache statistics for monitoring.
 *
 * Usage:
 *   const cache = new SmartCache('device-fingerprints', { maxSize: 500, defaultTTL: 3600000 });
 *   cache.set('key', value);
 *   const val = cache.get('key');
 *   cache.invalidate('key');
 *   const stats = cache.stats();
 */

const fs = require('fs');
const path = require('path');

class SmartCache {
  /**
   * @param {string} name - Cache namespace (used for disk file name)
   * @param {object} [options]
   * @param {number} [options.maxSize=200] - Maximum number of entries before LRU eviction
   * @param {number} [options.defaultTTL=3600000] - Default TTL in ms (1 hour)
   * @param {string} [options.cacheDir='.cache'] - Directory for disk persistence
   * @param {boolean} [options.persistToDisk=true] - Whether to write cache to disk
   * @param {object} [options.logger=null] - Injectable logger (this.log / console)
   */
  constructor(name, options = {}) {
    this._name = name;
    this._maxSize = options.maxSize || 200;
    this._defaultTTL = options.defaultTTL || 3600000; // 1 hour
    this._cacheDir = options.cacheDir || '.cache';
    this._persistToDisk = options.persistToDisk !== false;
    this._logger = options.logger || null;

    // Internal LRU map (insertion-ordered, newest at end)
    this._map = new Map();

    // Disk path
    this._diskPath = null;
    if (this._persistToDisk) {
      this._diskPath = path.resolve(this._cacheDir, `${this._sanitizeName(name)}.json`);
      this._loadFromDisk();
    }

    // Statistics
    this._stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0,
      invalidations: 0,
      diskReads: 0,
      diskWrites: 0,
      expired: 0,
    };
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Get a cached value by key. Returns undefined if not found or expired.
   * Updates LRU order on access.
   * @param {string} key
   * @returns {*|undefined}
   */
  get(key) {
    const entry = this._map.get(key);
    if (!entry) {
      this._stats.misses++;
      return undefined;
    }

    // Check TTL expiration
    if (entry.ttl && Date.now() > entry.expiresAt) {
      this._map.delete(key);
      this._stats.expired++;
      this._stats.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this._map.delete(key);
    this._map.set(key, entry);

    this._stats.hits++;
    return entry.value;
  }

  /**
   * Set a value in the cache.
   * @param {string} key
   * @param {*} value
   * @param {number} [ttl] - Per-entry TTL in ms (overrides default)
   */
  set(key, value, ttl) {
    const effectiveTTL = ttl !== undefined ? ttl : this._defaultTTL;

    // If key exists, delete first to refresh position
    if (this._map.has(key)) {
      this._map.delete(key);
    }

    // Evict LRU entry if at capacity
    if (this._map.size >= this._maxSize) {
      const oldestKey = this._map.keys().next().value;
      this._map.delete(oldestKey);
      this._stats.evictions++;
    }

    const entry = {
      value,
      ttl: effectiveTTL,
      expiresAt: effectiveTTL > 0 ? Date.now() + effectiveTTL : 0,
      createdAt: Date.now(),
    };

    this._map.set(key, entry);
    this._stats.sets++;

    // Auto-persist periodically (every 10 sets)
    if (this._stats.sets % 10 === 0 && this._persistToDisk) {
      this._saveToDisk();
    }
  }

  /**
   * Check if a key exists and is not expired.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    const entry = this._map.get(key);
    if (!entry) return false;
    if (entry.ttl && Date.now() > entry.expiresAt) {
      this._map.delete(key);
      this._stats.expired++;
      return false;
    }
    return true;
  }

  /**
   * Invalidate (delete) a specific key.
   * @param {string} key
   * @returns {boolean} true if key existed
   */
  invalidate(key) {
    const existed = this._map.delete(key);
    if (existed) this._stats.invalidations++;
    return existed;
  }

  /**
   * Invalidate all entries matching a prefix.
   * @param {string} prefix
   * @returns {number} number of entries invalidated
   */
  invalidatePrefix(prefix) {
    let count = 0;
    for (const key of this._map.keys()) {
      if (key.startsWith(prefix)) {
        this._map.delete(key);
        count++;
      }
    }
    this._stats.invalidations += count;
    return count;
  }

  /**
   * Clear all entries from the cache.
   */
  clear() {
    this._map.clear();
    this._stats.invalidations++;
  }

  /**
   * Return cache statistics.
   * @returns {object}
   */
  stats() {
    const total = this._stats.hits + this._stats.misses;
    return {
      name: this._name,
      size: this._map.size,
      maxSize: this._maxSize,
      hitRate: total > 0 ? (this._stats.hits / total * 100).toFixed(1) + '%' : '0%',
      hits: this._stats.hits,
      misses: this._stats.misses,
      evictions: this._stats.evictions,
      sets: this._stats.sets,
      invalidations: this._stats.invalidations,
      expired: this._stats.expired,
      diskReads: this._stats.diskReads,
      diskWrites: this._stats.diskWrites,
    };
  }

  /**
   * Flush cache to disk explicitly.
   */
  flush() {
    if (this._persistToDisk) {
      this._saveToDisk();
    }
  }

  /**
   * Destroy the cache and clean up disk file.
   */
  destroy() {
    this._map.clear();
    if (this._diskPath && fs.existsSync(this._diskPath)) {
      try {
        fs.unlinkSync(this._diskPath);
      } catch (_e) {
        // Log unlink failures for debugging; non-fatal
        if (typeof this.log === 'function') {
          this.log('[SMART-CACHE] Could not remove disk cache:', _e.message);
        }
      }
    }
  }

  /**
   * Prune all expired entries from the cache.
   * @returns {number} number of entries pruned
   */
  prune() {
    const now = Date.now();
    let count = 0;
    for (const [key, entry] of this._map.entries()) {
      if (entry.ttl && now > entry.expiresAt) {
        this._map.delete(key);
        count++;
      }
    }
    this._stats.expired += count;
    return count;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
  }

  _loadFromDisk() {
    try {
      if (this._diskPath && fs.existsSync(this._diskPath)) {
        const raw = fs.readFileSync(this._diskPath);
        const data = JSON.parse(raw);

        if (data && typeof data === 'object' && data.entries) {
          const now = Date.now();
          for (const [key, entry] of Object.entries(data.entries)) {
            // Skip expired entries
            if (entry.ttl && now > entry.expiresAt) continue;
            // Respect maxSize
            if (this._map.size >= this._maxSize) break;
            this._map.set(key, entry);
          }
          this._stats.diskReads++;
        }
      }
    } catch (_e) {
      // Disk load failure is non-fatal; start with empty cache
    }
  }

  _saveToDisk() {
    if (!this._diskPath) return;

    try {
      const dir = path.dirname(this._diskPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const entries = {};
      for (const [key, entry] of this._map.entries()) {
        // Skip expired entries before persisting
        if (entry.ttl && Date.now() > entry.expiresAt) continue;
        entries[key] = entry;
      }

      const data = JSON.stringify({
        name: this._name,
        version: 1,
        savedAt: Date.now(),
        entries,
      });

      fs.writeFileSync(this._diskPath, data, 'utf8');
      this._stats.diskWrites++;
    } catch (_e) {
      // Disk write failure is non-fatal
    }
  }
}

module.exports = SmartCache;
