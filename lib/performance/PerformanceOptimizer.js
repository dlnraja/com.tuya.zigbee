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
  
  /**
   * Memory optimization - Clear cache
   */
  clearCache() {
    this.cache.clear();
    this.currentMemory = 0;
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      memoryUsed: this.currentMemory,
      memoryLimit: this.maxCacheMemory,
      memoryPercent: Math.round((this.currentMemory / this.maxCacheMemory) * 100),
      sizeLimit: this.maxCacheSize
    };
  }
  
  /**
   * Lazy load - Only load when needed
   */
  async lazyLoad(key, loader) {
    const cached = this.getCache(key);
    if (cached) return cached;
    
    const value = await loader();
    this.cache(key, value);
    return value;
  }
  
  /**
   * Priority queue for requests
   */
  createPriorityQueue() {
    const queue = [];
    let processing = false;
    
    return {
      add: (task, priority = 0) => {
        queue.push({ task, priority });
        queue.sort((a, b) => b.priority - a.priority);
      },
      
      process: async () => {
        if (processing) return;
        processing = true;
        
        while (queue.length > 0) {
          const { task } = queue.shift();
          try {
            await task();
          } catch (err) {
            console.error('Queue task failed:', err);
          }
        }
        
        processing = false;
      }
    };
  }
  
  /**
   * Retry with exponential backoff
   */
  async retry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
  
  /**
   * Circuit breaker pattern
   */
  createCircuitBreaker(fn, options = {}) {
    const {
      threshold = 5,
      timeout = 60000,
      resetTimeout = 30000
    } = options;
    
    let failures = 0;
    let lastFailTime = 0;
    let state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    
    return async (...args) => {
      // Check if we should reset
      if (state === 'OPEN' && Date.now() - lastFailTime > resetTimeout) {
        state = 'HALF_OPEN';
        failures = 0;
      }
      
      // Circuit is open
      if (state === 'OPEN') {
        throw new Error('Circuit breaker is OPEN');
      }
      
      try {
        const result = await fn(...args);
        
        // Success - reset if half open
        if (state === 'HALF_OPEN') {
          state = 'CLOSED';
          failures = 0;
        }
        
        return result;
        
      } catch (err) {
        failures++;
        lastFailTime = Date.now();
        
        // Trip circuit breaker
        if (failures >= threshold) {
          state = 'OPEN';
        }
        
        throw err;
      }
    };
  }
  
  /**
   * Memoize function results
   */
  memoize(fn, keyFn) {
    const cache = new Map();
    
    return async (...args) => {
      const key = keyFn ? keyFn(...args) : JSON.stringify(args);
      
      if (cache.has(key)) {
        return cache.get(key);
      }
      
      const result = await fn(...args);
      cache.set(key, result);
      return result;
    };
  }
  
  /**
   * Object pool for reusing objects
   */
  createObjectPool(factory, options = {}) {
    const { min = 0, max = 10 } = options;
    const available = [];
    const inUse = new Set();
    
    // Initialize minimum objects
    for (let i = 0; i < min; i++) {
      available.push(factory());
    }
    
    return {
      acquire: () => {
        let obj;
        
        if (available.length > 0) {
          obj = available.pop();
        } else if (inUse.size < max) {
          obj = factory();
        } else {
          throw new Error('Pool exhausted');
        }
        
        inUse.add(obj);
        return obj;
      },
      
      release: (obj) => {
        inUse.delete(obj);
        if (available.length < max) {
          available.push(obj);
        }
      },
      
      size: () => ({
        available: available.length,
        inUse: inUse.size,
        total: available.length + inUse.size
      })
    };
  }
  
  /**
   * Async queue with concurrency limit
   */
  createAsyncQueue(concurrency = 1) {
    const queue = [];
    let running = 0;
    
    const processQueue = async () => {
      if (running >= concurrency || queue.length === 0) {
        return;
      }
      
      running++;
      const { task, resolve, reject } = queue.shift();
      
      try {
        const result = await task();
        resolve(result);
      } catch (err) {
        reject(err);
      } finally {
        running--;
        processQueue();
      }
    };
    
    return {
      push: (task) => {
        return new Promise((resolve, reject) => {
          queue.push({ task, resolve, reject });
          processQueue();
        });
      },
      
      size: () => queue.length,
      running: () => running
    };
  }
  
  /**
   * Performance monitoring
   */
  createPerformanceMonitor() {
    const metrics = new Map();
    
    return {
      start: (label) => {
        metrics.set(label, {
          start: Date.now(),
          memory: process.memoryUsage().heapUsed
        });
      },
      
      end: (label) => {
        const metric = metrics.get(label);
        if (!metric) return null;
        
        const duration = Date.now() - metric.start;
        const memoryDelta = process.memoryUsage().heapUsed - metric.memory;
        
        metrics.delete(label);
        
        return {
          duration,
          memory: memoryDelta,
          memoryMB: (memoryDelta / 1024 / 1024).toFixed(2)
        };
      },
      
      getAll: () => Array.from(metrics.entries())
    };
  }
};
