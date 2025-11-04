'use strict';

/**
 * Performance Optimization Suite
 * Optimized for Homey Pro limits (512 MB RAM)
 * SDK3 COMPLIANT
 */

module.exports = class PerformanceOptimizer {
  
  constructor(options = {}) {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.rateLimits = new Map();
    
    // Homey Pro memory limits
    this.maxCacheSize = options.maxCacheSize || 1000; // Max 1000 items
    this.maxCacheMemory = options.maxCacheMemory || 10 * 1024 * 1024; // Max 10 MB
    this.currentMemory = 0;
  }
  
  /**
   * Estimate memory size
   */
  _estimateSize(value) {
    try {
      return JSON.stringify(value).length * 2; // Rough estimate in bytes
    } catch (err) {
      return 1024; // Default 1KB if can't stringify
    }
  }
  
  /**
   * Enforce cache limits (Homey Pro memory)
   */
  _enforceLimits() {
    // Check size limit
    while (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      const item = this.cache.get(firstKey);
      if (item) {
        this.currentMemory -= item.size || 0;
      }
      this.cache.delete(firstKey);
    }
    
    // Check memory limit
    while (this.currentMemory > this.maxCacheMemory && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      const item = this.cache.get(firstKey);
      if (item) {
        this.currentMemory -= item.size || 0;
      }
      this.cache.delete(firstKey);
    }
  }
  
  /**
   * Intelligent caching with TTL and memory limits
   */
  cache(key, value, ttl = 60000) {
    const size = this._estimateSize(value);
    
    // Don't cache if too large
    if (size > this.maxCacheMemory / 10) {
      return; // Skip items > 10% of max memory
    }
    
    // Remove old entry if exists
    const oldItem = this.cache.get(key);
    if (oldItem) {
      this.currentMemory -= oldItem.size || 0;
    }
    
    // Add new entry
    this.cache.set(key, {
      value,
      size,
      expires: Date.now() + ttl
    });
    
    this.currentMemory += size;
    
    // Enforce limits
    this._enforceLimits();
    
    // Auto-cleanup
    setTimeout(() => {
      const item = this.cache.get(key);
      if (item) {
        this.currentMemory -= item.size || 0;
        this.cache.delete(key);
      }
    }, ttl);
  }
  
  /**
   * Get from cache
   */
  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.value;
  }
  
  /**
   * Request deduplication
   */
  async deduplicate(key, fn) {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }
    
    // Execute and store promise
    const promise = fn();
    this.pendingRequests.set(key, promise);
    
    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }
  
  /**
   * Rate limiting
   */
  async rateLimit(key, fn, interval = 1000) {
    const lastCall = this.rateLimits.get(key);
    const now = Date.now();
    
    if (lastCall && (now - lastCall) < interval) {
      const delay = interval - (now - lastCall);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.rateLimits.set(key, Date.now());
    return fn();
  }
  
  /**
   * Debounce function calls
   */
  debounce(fn, delay = 300) {
    let timeout;
    return function(...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }
  
  /**
   * Throttle function calls
   */
  throttle(fn, interval = 1000) {
    let lastCall = 0;
    return function(...args) {
      const now = Date.now();
      if (now - lastCall >= interval) {
        lastCall = now;
        return fn.apply(this, args);
      }
    };
  }
  
  /**
   * Batch requests
   */
  async batch(requests, batchSize = 10) {
    const results = [];
    
    for (let i = 0; i < requests.length; i += batchSize) {
      const batch = requests.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    return results;
  }
};
