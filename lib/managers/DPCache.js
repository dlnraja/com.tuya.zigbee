'use strict';
// v9.0.40: DP Response Cache
// Caches last known DP values per device for timeout fallback and stale reads
// Helps maintain UI consistency during brief disconnections

/**
 * DPCache - Per-device DP value cache with TTL
 *
 * Stores the last known value for each DP on a device.
 * Returns cached values when the device is unreachable.
 * Invalidates on explicit refresh.
 *
 * Usage:
 *   const cache = new DPCache(deviceId, { ttlMs: 300000 });
 *   cache.set(1, true);       // Cache DP1 = true
 *   cache.get(1);             // Returns { value: true, age: 1234 }
 *   cache.get(99);            // Returns null (not cached)
 */
class DPCache {
  /**
   * @param {string} deviceId - Device identifier
   * @param {object} [options]
   * @param {number} [options.ttlMs=300000] - Cache TTL in ms (default 5 minutes)
   * @param {number} [options.maxEntries=100] - Max cached DPs per device
   */
  constructor(deviceId, options = {}) {
    this._deviceId = deviceId;
    this._ttlMs = options.ttlMs || 300000; // 5 minutes default
    this._maxEntries = options.maxEntries || 100;
    this._cache = new Map(); // dpId -> { value, timestamp }
    this._stats = { hits: 0, misses: 0, sets: 0, evictions: 0 };
  }

  /**
   * Get a cached DP value
   * @param {number|string} dpId - DP identifier
   * @returns {{ value: *, age: number }|null} Cached value with age in ms, or null
   */
  get(dpId) {
    const entry = this._cache.get(dpId);
    if (!entry) {
      this._stats.misses++;
      return null;
    }

    const age = Date.now() - entry.timestamp;
    if (age > this._ttlMs) {
      // Expired
      this._cache.delete(dpId);
      this._stats.misses++;
      return null;
    }

    this._stats.hits++;
    return { value: entry.value, age };
  }

  /**
   * Cache a DP value
   * @param {number|string} dpId - DP identifier
   * @param {*} value - DP value
   */
  set(dpId, value) {
    // Evict oldest entries if at capacity
    if (this._cache.size >= this._maxEntries && !this._cache.has(dpId)) {
      const oldest = this._cache.keys().next().value;
      this._cache.delete(oldest);
      this._stats.evictions++;
    }

    this._cache.set(dpId, { value, timestamp: Date.now() });
    this._stats.sets++;
  }

  /**
   * Update cache from a DPS object (batch update)
   * @param {object} dps - DP-value pairs { 1: true, 2: 22.5 }
   */
  updateFromDps(dps) {
    if (!dps || typeof dps !== 'object') return;
    for (const [dpId, value] of Object.entries(dps)) {
      this.set(dpId, value);
    }
  }

  /**
   * Invalidate (clear) a specific DP or all DPs
   * @param {number|string} [dpId] - If omitted, clears all
   */
  invalidate(dpId) {
    if (dpId !== undefined) {
      this._cache.delete(dpId);
    } else {
      this._cache.clear();
    }
  }

  /**
   * Get all cached values (for snapshot/restore)
   * @returns {object} DP-value pairs
   */
  snapshot() {
    const result = {};
    const now = Date.now();
    for (const [dpId, entry] of this._cache) {
      if (now - entry.timestamp <= this._ttlMs) {
        result[dpId] = entry.value;
      }
    }
    return result;
  }

  /**
   * Get cache statistics
   * @returns {{ hits: number, misses: number, sets: number, evictions: number, size: number, hitRate: string }}
   */
  getStats() {
    const total = this._stats.hits + this._stats.misses;
    return {
      ...this._stats,
      size: this._cache.size,
      hitRate: total > 0 ? `${((this._stats.hits / total) * 100).toFixed(1)}%` : '0%',
    };
  }

  /**
   * Destroy the cache
   */
  destroy() {
    this._cache.clear();
  }
}

// Global cache registry (one cache per device)
const _caches = new Map();

/**
 * Get or create a DPCache for a device
 * @param {string} deviceId
 * @param {object} [options]
 * @returns {DPCache}
 */
function getDeviceCache(deviceId, options) {
  if (!_caches.has(deviceId)) {
    _caches.set(deviceId, new DPCache(deviceId, options));
  }
  return _caches.get(deviceId);
}

/**
 * Remove a device's cache (call on device deletion)
 * @param {string} deviceId
 */
function removeDeviceCache(deviceId) {
  const cache = _caches.get(deviceId);
  if (cache) {
    cache.destroy();
    _caches.delete(deviceId);
  }
}

module.exports = { DPCache, getDeviceCache, removeDeviceCache };
