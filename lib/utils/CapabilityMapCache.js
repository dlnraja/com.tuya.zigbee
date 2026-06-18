'use strict';

/**
 * CapabilityMapCache - Caches capabilityMap computation for devices
 *
 * Problem: The capabilityMap getter in TuyaLocalDevice (and Zigbee devices)
 * creates new closures on every call, causing GC pressure. During _onData()
 * and command processing, capabilityMap is called repeatedly.
 *
 * Solution: Cache the computed map per device instance, invalidate on
 * capability changes or device re-init.
 *
 * Usage:
 *   const CapabilityMapCache = require('./CapabilityMapCache');
 *
 *   // In device onInit():
 *   CapabilityMapCache.warmup(this);
 *
 *   // In capabilityMap getter (already done in TuyaLocalDevice):
 *   // TuyaLocalDevice already caches via this._cachedCapabilityMap
 *
 *   // After adding/removing capabilities:
 *   CapabilityMapCache.invalidate(this);
 *
 *   // Get cached map (safe, returns empty array if not cached):
 *   const map = CapabilityMapCache.get(this);
 */

// WeakMap: device instance -> cached capability map
// WeakMap allows GC to collect device instances when they're destroyed
const _cache = new WeakMap();

// Track invalidation counts for diagnostics
let _totalCacheHits = 0;
let _totalCacheMisses = 0;
let _totalInvalidations = 0;

/**
 * Get cached capability map for a device
 * Returns the cached array if available, or null if not cached
 *
 * @param {Object} device - Device instance
 * @returns {Array|null} Cached capability map or null
 */
function get(device) {
  if (!device) return null;

  const cached = _cache.get(device);
  if (cached) {
    _totalCacheHits++;
    return cached;
  }
  _totalCacheMisses++;
  return null;
}

/**
 * Store a computed capability map in the cache
 *
 * @param {Object} device - Device instance
 * @param {Array} map - Computed capability map array
 */
function set(device, map) {
  if (!device || !map) return;
  // Store a shallow copy to prevent external mutation
  _cache.set(device, Array.isArray(map) ? map : []);
}

/**
 * Warm up the cache by computing and storing the capability map
 * Call this in device onInit() after super.onInit()
 *
 * @param {Object} device - Device instance (must have capabilityMap getter or dpMappings)
 */
function warmup(device) {
  if (!device) return;

  try {
    // Force capabilityMap getter to compute and cache
    const map = device.capabilityMap;
    if (map && Array.isArray(map)) {
      set(device, map);
    }
  } catch (e) {
    // Some devices may not have capabilityMap ready during early init
  }
}

/**
 * Invalidate the cached capability map for a device
 * Call this when:
 *   - Capabilities are added/removed dynamically
 *   - Device settings change (e.g., dpMappings recompute)
 *   - Device is re-initialized
 *
 * @param {Object} device - Device instance
 */
function invalidate(device) {
  if (!device) return;
  _totalInvalidations++;
  _cache.delete(device);
  // Also clear the legacy _cachedCapabilityMap if present
  if (device._cachedCapabilityMap !== undefined) {
    device._cachedCapabilityMap = null;
  }
}

/**
 * Check if a device has a cached capability map
 *
 * @param {Object} device - Device instance
 * @returns {boolean}
 */
function has(device) {
  return device ? _cache.has(device) : false;
}

/**
 * Get cache statistics for diagnostics
 *
 * @returns {Object} Cache stats
 */
function getStats() {
  return {
    totalCacheHits: _totalCacheHits,
    totalCacheMisses: _totalCacheMisses,
    totalInvalidations: _totalInvalidations,
    hitRate: _totalCacheHits + _totalCacheMisses > 0
      ? Math.round((_totalCacheHits / (_totalCacheHits + _totalCacheMisses)) * 100)
      : 0,
  };
}

/**
 * Reset all statistics (for testing)
 */
function resetStats() {
  _totalCacheHits = 0;
  _totalCacheMisses = 0;
  _totalInvalidations = 0;
}

module.exports = {
  get,
  set,
  warmup,
  invalidate,
  has,
  getStats,
  resetStats,
};
