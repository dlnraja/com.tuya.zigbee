'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

/**
 * FALLBACK SYSTEM - Intelligent Multi-Strategy
 *
 * v7.5.3: CRITICAL FIX - Restored from automated remediation corruption.
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

          this.error(` [${name}] ALL ${strategies.length} strategies failed (${duration}ms)`);
          throw new Error(`${name}: All ${strategies.length} strategies exhausted. Last error: ${err.message}`);
        }

        // Try next strategy
        this.debug(`[${name}] Moving to next strategy...`);
      }
    }
  }

  /**
   * Retry function with exponential backoff
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
   */
  async readAttributeWithFallback(cluster, attribute, options = {}) {
    const cacheKey = `${cluster}.${attribute}`;

    const strategies = [
      async () => {
        this.trace(`Strategy 1: Direct read ep1 ${cluster}.${attribute}`);
        return await this.device.zclNode.endpoints[1].clusters[cluster].readAttributes(attribute);
      },
      async () => {
        if (!this.device.zclNode.endpoints[2]) {
          throw new Error('Endpoint 2 not available');
        }
        this.trace(`Strategy 2: Try ep2 ${cluster}.${attribute}`);
        return await this.device.zclNode.endpoints[2].clusters[cluster].readAttributes(attribute);
      },
      async () => {
        this.trace(`Strategy 3: Try all endpoints ${cluster}.${attribute}`);
        const endpoints = Object.keys(this.device.zclNode.endpoints);

        for (const ep of endpoints) {
          try {
            const attr = await this.device.zclNode.endpoints[ep].clusters[cluster]?.readAttributes(attribute);
            if (attr) return attr;
          } catch (err) { /* skip */ }
        }
        throw new Error('All endpoints failed');
      },
      async () => {
        this.trace(`Strategy 4: Force report ${cluster}.${attribute}`);
        const endpoint = this.device.zclNode.endpoints[1];
        if (!endpoint.clusters[cluster]) throw new Error(`Cluster ${cluster} not available`);
        await this.sleep(2000);
        return await endpoint.clusters[cluster].readAttributes(attribute);
      },
      async () => {
        this.trace(`Strategy 5: Use cache ${cluster}.${attribute}`);
        const cached = this.device.getStoreValue(cacheKey);
        if (cached === null || cached === undefined) throw new Error('No cached value available');
        return cached;
      }
    ];

    return this.executeWithFallback(`readAttribute(${cluster}.${attribute})`, strategies, options);
  }

  /**
   * Configure report with fallback
   */
  async configureReportWithFallback(config, options = {}) {
    const { cluster, attributeName, minInterval, maxInterval, minChange } = config;

    const strategies = [
      async () => {
        return await this.device.configureAttributeReporting([{
          endpointId: config.endpointId || 1,
          cluster,
          attributeName,
          minInterval,
          maxInterval,
          minChange
        }]);
      },
      async () => {
        return await this.device.configureAttributeReporting([{
          endpointId: config.endpointId || 1,
          cluster,
          attributeName,
          minInterval: minInterval * 2,
          maxInterval: maxInterval * 2,
          minChange: minChange * 2
        }]);
      },
      async () => {
        const endpoint = this.device.zclNode.endpoints[config.endpointId || 1];
        const clusterObj = endpoint.clusters?.[cluster];
        if (clusterObj && typeof clusterObj.bind === 'function') {
          try {
            await clusterObj.bind();
            await this.sleep(1000);
          } catch (err) { /* ignore */ }
        }
        return await this.device.configureAttributeReporting([{
          endpointId: config.endpointId || 1,
          cluster,
          attributeName,
          minInterval,
          maxInterval,
          minChange
        }]);
      },
      async () => {
        await this.device.setStoreValue(`poll_${cluster}_${attributeName}`, true);
        return { success: true, method: 'polling' };
      }
    ];

    return this.executeWithFallback(`configureReport(${cluster}.${attributeName})`, strategies, options);
  }

  async iasEnrollWithFallback(options = {}) {
    const strategies = [
      async () => {
        const IASZoneEnroller = require('../IASZoneEnroller');
        const enroller = new IASZoneEnroller(this.device, this.device.zclNode);
        return await enroller.enroll();
      },
      async () => {
        await this.sleep(5000);
        const IASZoneEnroller = require('../IASZoneEnroller');
        const enroller = new IASZoneEnroller(this.device, this.device.zclNode);
        return await enroller.enroll();
      },
      async () => {
        const endpoint = this.device.zclNode.endpoints[1];
        return await endpoint.clusters.iasZone.readAttributes('zoneStatus');
      }
    ];

    return this.executeWithFallback('iasEnroll', strategies, options);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  updateAvgDuration(duration) {
    if (!this.options.trackPerformance) return;
    const total = this.stats.attempts;
    this.stats.avgDuration = ((this.stats.avgDuration * (total - 1)) + duration) / total;
  }

  getStats() {
    return {
      ...this.stats,
      successRate: this.stats.attempts > 0
        ? ((this.stats.successes / this.stats.attempts) * 100).toFixed(1) + '%'
        : '0%'
    };
  }

  resetStats() {
    this.stats = { attempts: 0, successes: 0, failures: 0, strategySuccesses: {}, avgDuration: 0 };
  }

  shouldLog(level) {
    const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR'];
    const currentLevel = levels.indexOf(this.options.verbosity);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= currentLevel;
  }

  trace(...args) { if (this.shouldLog('TRACE')) this.device.log('[TRACE]', ...args); }
  debug(...args) { if (this.shouldLog('DEBUG')) this.device.log('[DEBUG]', ...args); }
  log(...args) { if (this.shouldLog('INFO')) this.device.log('[INFO]', ...args); }
  warn(...args) { if (this.shouldLog('WARN')) this.device.log('[WARN]', ...args); }
  error(...args) { if (this.shouldLog('ERROR')) this.device.error('[ERROR]', ...args); }
}

module.exports = FallbackSystem;
