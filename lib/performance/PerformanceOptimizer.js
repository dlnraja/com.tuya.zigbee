'use strict';

/**
 * Performance Optimization Suite
 */

module.exports = class PerformanceOptimizer {
  
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.rateLimits = new Map();
  }
  
  /**
   * Intelligent caching with TTL
   */
  cache(key, value, ttl = 60000) {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttl
    });
    
    // Auto-cleanup
    setTimeout(() => this.cache.delete(key), ttl);
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
