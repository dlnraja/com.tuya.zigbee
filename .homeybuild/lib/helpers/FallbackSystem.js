'use strict';

/**
 * FALLBACK SYSTEM - Intelligent Multi-Strategy
 *
 * Système intelligent qui essaye multiple stratégies jusqu'à succès
 * Basé sur best practices d'autres apps Homey (IKEA, Xiaomi, SONOFF)
 *
 * Features:
 * - Multi-level fallback (Strategy 1, 2, 3, 4+)
 * - Retry with exponential backoff
 * - Verbose debug logging
 * - Performance tracking
 * - Auto-recovery
 */

class FallbackSystem {
  constructor(device, options = {}) {
    this.device = device;
    this.options = {
      maxRetries: options.maxRetries || 3,
      baseDelay: options.baseDelay || 1000,
      verbosity: options.verbosity || 'INFO', // TRACE, DEBUG, INFO, WARN, ERROR
      trackPerformance: options.trackPerformance !== false
    };

    this.stats = {
      attempts: 0,
      successes: 0,
      failures: 0,
      strategySuccesses: {},
      avgDuration: 0
    };
  }

  /**
   * Execute function with multiple fallback strategies
   *
   * @param {String} name - Operation name (for logging)
   * @param {Array<Function>} strategies - Array of functions to try
   * @param {Object} options - Override default options
   * @returns {Promise<any>} Result from first successful strategy
   */
  async executeWithFallback(name, strategies, options = {}) {
    const startTime = Date.now();
    const opts = { ...this.options, ...options };

    this.stats.attempts++;
    this.debug(`[SYNC] [${name}] Starting with ${strategies.length} strategies`);

    for (let i = 0; i < strategies.length; i++) {
      const strategyName = `Strategy ${i + 1}/${strategies.length}`;

      try {
        this.trace(`[${name}] Trying ${strategyName}...`);

        const result = await this.retryWithBackoff(
          strategies[i],
          opts.maxRetries,
          opts.baseDelay,
          `${name} - ${strategyName}`
        );

        // Success!
        const duration = Date.now() - startTime;
        this.stats.successes++;
        this.stats.strategySuccesses[i] = (this.stats.strategySuccesses[i] || 0) + 1;
        this.updateAvgDuration(duration);

        this.log(`[OK] [${name}] ${strategyName} succeeded (${duration}ms)`);
        return result;

      } catch (err) {
        this.debug(`[ERROR] [${name}] ${strategyName} failed: ${err.message}`);

        // Last strategy failed too
        if (i === strategies.length - 1) {
          const duration = Date.now() - startTime;
          this.stats.failures++;

          this.error(`💥 [${name}] ALL ${strategies.length} strategies failed (${duration}ms)`);
          throw new Error(`${name}: All ${strategies.length} strategies exhausted. Last error: ${err.message}`);
        }

        // Try next strategy
        this.debug(`[${name}] Moving to next strategy...`);
      }
    }
  }

  /**
   * Retry function with exponential backoff
   *
   * @param {Function} fn - Function to retry
   * @param {Number} maxRetries - Max retry attempts
   * @param {Number} baseDelay - Base delay in ms
   * @param {String} name - Operation name
   * @returns {Promise<any>} Function result
   */
  async retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, name = 'Operation') {
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        this.trace(`[${name}] Attempt ${attempt + 1}/${maxRetries}`);
        return await fn();

      } catch (err) {
        lastError = err;

        if (attempt < maxRetries - 1) {
          const delay = baseDelay * Math.pow(2, attempt);
          const jitter = Math.random() * 0.3 * delay; // +/- 30% jitter
          const totalDelay = Math.floor(delay + jitter);

          this.debug(`[${name}] Retry ${attempt + 1}/${maxRetries} after ${totalDelay}ms`);
          await this.sleep(totalDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Read Zigbee attribute with intelligent fallback
   *
   * Strategies:
   * 1. Direct read endpoint 1
   * 2. Try endpoint 2
   * 3. Try all available endpoints
   * 4. Poll via report binding
   * 5. Use cached value (if available)
   */
  async readAttributeWithFallback(cluster, attribute, options = {}) {
    const cacheKey = `${cluster}.${attribute}`;

    const strategies = [
      // Strategy 1: Direct read endpoint 1
      async () => {
        this.trace(`Strategy 1: Direct read ep1 ${cluster}.${attribute}`);
        return await this.device.zclNode.endpoints[1].clusters[cluster].readAttributes(attribute);
      },

      // Strategy 2: Try endpoint 2
      async () => {
        if (!this.device.zclNode.endpoints[2]) {
          throw new Error('Endpoint 2 not available');
        }
        this.trace(`Strategy 2: Try ep2 ${cluster}.${attribute}`);
        return await this.device.zclNode.endpoints[2].clusters[cluster].readAttributes(attribute);
      },

      // Strategy 3: Try all endpoints
      async () => {
        this.trace(`Strategy 3: Try all endpoints ${cluster}.${attribute}`);
        const endpoints = Object.keys(this.device.zclNode.endpoints);

        for (const ep of endpoints) {
          try {
            return await this.device.zclNode.endpoints[ep].clusters[cluster]?.readAttributes(attribute);
          } catch (err) {
            // Try next endpoint
          }
        }
        throw new Error('All endpoints failed');
      },

      // Strategy 4: Force report (if configured)
      async () => {
        this.trace(`Strategy 4: Force report ${cluster}.${attribute}`);

        // Trigger report by reading reportable attribute
        const endpoint = this.device.zclNode.endpoints[1];
        if (!endpoint.clusters[cluster]) {
          throw new Error(`Cluster ${cluster} not available`);
        }

        // Wait a bit for report to arrive
        await this.sleep(2000);

        // Try read again
        return await endpoint.clusters[cluster].readAttributes(attribute);
      },

      // Strategy 5: Use cached value (last resort)
      async () => {
        this.trace(`Strategy 5: Use cache ${cluster}.${attribute}`);
        const cached = this.device.getStoreValue(cacheKey);

        if (cached === null || cached === undefined) {
          throw new Error('No cached value available');
        }

        this.debug(`Using cached value for ${cluster}.${attribute}:`, cached);
        return cached;
      }
    ];

    return this.executeWithFallback(
      `readAttribute(${cluster}.${attribute})`,
      strategies,
      options
    );
  }

  /**
   * Configure report with fallback
   *
   * Strategies:
   * 1. Standard configureReportAttribute
   * 2. Try with different intervals
   * 3. Try bind + report
   * 4. Manual polling fallback
   */
  async configureReportWithFallback(config, options = {}) {
    const { cluster, attributeName, minInterval, maxInterval, minChange } = config;

    const strategies = [
      // Strategy 1: Standard report config
      async () => {
        this.trace(`Strategy 1: Standard report config ${cluster}.${attributeName}`);
        return await this.device.configureAttributeReporting([{
          endpointId: config.endpointId || 1,
          cluster,
          attributeName,
          minInterval,
          maxInterval,
          minChange
        }]);
      },

      // Strategy 2: Relaxed intervals
      async () => {
        this.trace(`Strategy 2: Relaxed intervals ${cluster}.${attributeName}`);
        return await this.device.configureAttributeReporting([{
          endpointId: config.endpointId || 1,
          cluster,
          attributeName,
          minInterval: minInterval * 2,
          maxInterval: maxInterval * 2,
          minChange: minChange * 2
        }]);
      },

      // Strategy 3: Bind then configure
      async () => {
        this.trace(`Strategy 3: Bind + report ${cluster}.${attributeName}`);

        const endpoint = this.device.zclNode.endpoints[config.endpointId || 1];

        // Bind first (with defensive check)
        const clusterObj = endpoint.clusters?.[cluster];
        if (clusterObj && typeof clusterObj.bind === 'function') {
          try {
            await clusterObj.bind();
            await this.sleep(1000);
          } catch (err) {
            this.device.log(`[FALLBACK] Bind failed for ${cluster}:`, err.message);
          }
        } else {
          this.device.log(`[FALLBACK] Cluster ${cluster} not available or no bind method`);
        }

        // Then configure
        return await this.device.configureAttributeReporting([{
          endpointId: config.endpointId || 1,
          cluster,
          attributeName,
          minInterval,
          maxInterval,
          minChange
        }]);
      },

      // Strategy 4: Manual polling (fallback if reports don't work)
      async () => {
        this.trace(`Strategy 4: Manual polling fallback ${cluster}.${attributeName}`);
        this.debug(`[WARN]  Report config failed, will use manual polling for ${cluster}.${attributeName}`);

        // Set flag for device to use polling
        await this.device.setStoreValue(`poll_${cluster}_${attributeName}`, true);

        return { success: true, method: 'polling' };
      }
    ];

    return this.executeWithFallback(
      `configureReport(${cluster}.${attributeName})`,
      strategies,
      options
    );
  }

  /**
   * IAS Zone enrollment with fallback
   */
  async iasEnrollWithFallback(options = {}) {
    const strategies = [
      // Strategy 1: Standard enrollment
      async () => {
        this.trace('Strategy 1: Standard IAS enrollment');
        const IASZoneEnroller = require('../IASZoneEnroller');
        const enroller = new IASZoneEnroller(this.device, this.device.zclNode);
        return await enroller.enroll();
      },

      // Strategy 2: Delayed enrollment
      async () => {
        this.trace('Strategy 2: Delayed IAS enrollment');
        await this.sleep(5000);
        const IASZoneEnroller = require('../IASZoneEnroller');
        const enroller = new IASZoneEnroller(this.device, this.device.zclNode);
        return await enroller.enroll();
      },

      // Strategy 3: Manual zone status read
      async () => {
        this.trace('Strategy 3: Manual IAS zone read');
        const endpoint = this.device.zclNode.endpoints[1];
        return await endpoint.clusters.iasZone.readAttributes('zoneStatus');
      }
    ];

    return this.executeWithFallback('iasEnroll', strategies, options);
  }

  /**
   * Sleep helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average duration
   */
  updateAvgDuration(duration) {
    if (!this.options.trackPerformance) return;

    const total = this.stats.attempts;
    this.stats.avgDuration = ((this.stats.avgDuration * (total - 1)) + duration) / total;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.attempts > 0
        ? (this.stats.successes / this.stats.attempts * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      attempts: 0,
      successes: 0,
      failures: 0,
      strategySuccesses: {},
      avgDuration: 0
    };
  }

  // Logging helpers
  trace(...args) {
    if (this.shouldLog('TRACE')) {
      this.device.log('[TRACE]', ...args);
    }
  }

  debug(...args) {
    if (this.shouldLog('DEBUG')) {
      this.device.log('[DEBUG]', ...args);
    }
  }

  log(...args) {
    if (this.shouldLog('INFO')) {
      this.device.log('[INFO]', ...args);
    }
  }

  warn(...args) {
    if (this.shouldLog('WARN')) {
      this.device.log('[WARN]', ...args);
    }
  }

  error(...args) {
    if (this.shouldLog('ERROR')) {
      this.device.error('[ERROR]', ...args);
    }
  }

  shouldLog(level) {
    const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevel = levels.indexOf(this.options.verbosity);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }
}

module.exports = FallbackSystem;
