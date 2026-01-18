'use strict';

/**
 * EVENT DEDUPLICATION LAYER - v5.5.670
 * Rule: 1 physical action = 1 Homey event
 * Prevents duplicate events from hybrid ZCL + Tuya DP devices
 */

class EventDeduplicationLayer {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 300;
    this.cache = new Map();
    this.stats = { total: 0, deduped: 0 };
  }

  /**
   * Check if event should be processed or is a duplicate
   * @param {string} deviceId 
   * @param {string} capability 
   * @param {any} value 
   * @returns {boolean} true if event should be processed
   */
  shouldProcess(deviceId, capability, value) {
    this.stats.total++;
    const key = `${deviceId}:${capability}`;
    const hash = `${key}:${JSON.stringify(value)}`;
    const now = Date.now();
    const cached = this.cache.get(key);
    
    if (cached && cached.hash === hash && (now - cached.time) < this.windowMs) {
      this.stats.deduped++;
      return false;
    }
    
    this.cache.set(key, { hash, time: now, value });
    this._cleanup();
    return true;
  }

  /**
   * Wrap a capability setter with deduplication
   */
  wrap(device, capability, setter) {
    return async (value) => {
      const id = device.getData?.()?.id || device.id || 'unknown';
      if (this.shouldProcess(id, capability, value)) {
        return setter(value);
      }
    };
  }

  _cleanup() {
    if (this.cache.size > 1000) {
      const cutoff = Date.now() - this.windowMs * 10;
      for (const [k, v] of this.cache) {
        if (v.time < cutoff) this.cache.delete(k);
      }
    }
  }

  getStats() {
    return { ...this.stats, cacheSize: this.cache.size };
  }
}

module.exports = EventDeduplicationLayer;
