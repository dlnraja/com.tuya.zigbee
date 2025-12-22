'use strict';

/**
 * RetryWithBackoff - Exponential backoff retry utility for Zigbee operations
 * v5.2.9 - Handle stubborn battery devices that don't respond immediately
 */

class RetryWithBackoff {
  /**
   * Create a retry handler
   * @param {Object} device - The Homey device instance
   * @param {Object} options - Configuration options
   */
  constructor(device, options = {}) {
    this.device = device;
    this.maxRetries = options.maxRetries || 3;
    this.baseDelay = options.baseDelay || 2000; // 2 seconds
    this.maxDelay = options.maxDelay || 30000; // 30 seconds
    this.timeout = options.timeout || 10000; // 10 seconds per attempt
    this.jitter = options.jitter !== false; // Add randomness by default
  }

  /**
   * Calculate delay with exponential backoff and optional jitter
   * @param {number} attempt - Current attempt number (0-indexed)
   * @returns {number} Delay in milliseconds
   */
  calculateDelay(attempt) {
    // Exponential: 2s, 4s, 8s, 16s, ...
    let delay = this.baseDelay * Math.pow(2, attempt);

    // Cap at max delay
    delay = Math.min(delay, this.maxDelay);

    // Add jitter (±25%)
    if (this.jitter) {
      const jitterRange = delay * 0.25;
      delay += (Math.random() * jitterRange * 2) - jitterRange;
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified duration
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute an async function with retry and exponential backoff
   * @param {Function} fn - Async function to execute
   * @param {Object} context - Context for logging
   * @returns {Promise<any>} Result of the function
   */
  async execute(fn, context = {}) {
    const { operation = 'operation', dpId = null } = context;
    let lastError = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        // Create a timeout wrapper
        const result = await this.withTimeout(fn(), this.timeout);

        if (attempt > 0) {
          this.device.log(`[RETRY] ✅ ${operation} succeeded on attempt ${attempt + 1}`);
        }

        return result;
      } catch (error) {
        lastError = error;
        const isTimeout = error.message?.includes('Timeout') || error.message?.includes('timeout');
        const isLastAttempt = attempt === this.maxRetries - 1;

        if (isLastAttempt) {
          this.device.log(`[RETRY] ❌ ${operation} failed after ${this.maxRetries} attempts: ${error.message}`);
          break;
        }

        const delay = this.calculateDelay(attempt);

        if (isTimeout) {
          this.device.log(`[RETRY] ⏱️ ${operation} timeout (attempt ${attempt + 1}/${this.maxRetries}), waiting ${delay}ms...`);
        } else {
          this.device.log(`[RETRY] ⚠️ ${operation} failed (attempt ${attempt + 1}/${this.maxRetries}): ${error.message}, waiting ${delay}ms...`);
        }

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    throw lastError;
  }

  /**
   * Wrap a promise with a timeout
   * @param {Promise} promise - Promise to wrap
   * @param {number} ms - Timeout in milliseconds
   * @returns {Promise<any>}
   */
  withTimeout(promise, ms) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout: Expected Response after ${ms}ms`));
      }, ms);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Query a Tuya DP with retry
   * @param {Object} cluster - The Tuya cluster
   * @param {number} dpId - DataPoint ID
   * @returns {Promise<any>}
   */
  async queryDP(cluster, dpId) {
    if (!cluster) {
      throw new Error('Cluster not available');
    }

    return this.execute(
      async () => {
        // Try getData first (most common method)
        if (typeof cluster.getData === 'function') {
          return await cluster.getData(dpId);
        }

        // Fallback to sendCommand
        if (typeof cluster.sendCommand === 'function') {
          return await cluster.sendCommand('dataRequest', {
            dp: dpId,
            fn: 0,
            data: Buffer.from([])
          });
        }

        throw new Error('No suitable query method available');
      },
      { operation: `DP${dpId} query`, dpId }
    );
  }

  /**
   * Set a Tuya DP with retry
   * @param {Object} cluster - The Tuya cluster
   * @param {number} dpId - DataPoint ID
   * @param {any} value - Value to set
   * @param {number} dataType - Tuya data type
   * @returns {Promise<any>}
   */
  async setDP(cluster, dpId, value, dataType = 0x02) {
    if (!cluster) {
      throw new Error('Cluster not available');
    }

    return this.execute(
      async () => {
        if (typeof cluster.setData === 'function') {
          return await cluster.setData(dpId, value, dataType);
        }

        throw new Error('setData method not available');
      },
      { operation: `DP${dpId} set`, dpId }
    );
  }

  /**
   * Read ZCL attribute with retry
   * @param {Object} cluster - The ZCL cluster
   * @param {string} attributeName - Attribute name
   * @returns {Promise<any>}
   */
  async readAttribute(cluster, attributeName) {
    if (!cluster) {
      throw new Error('Cluster not available');
    }

    return this.execute(
      async () => {
        if (typeof cluster.readAttributes === 'function') {
          const result = await cluster.readAttributes([attributeName]);
          return result[attributeName];
        }

        throw new Error('readAttributes method not available');
      },
      { operation: `Attribute ${attributeName} read` }
    );
  }
}

/**
 * Device-type specific presets
 */
RetryWithBackoff.PRESETS = {
  // Battery devices have aggressive sleep cycles
  BATTERY_DEVICE: {
    maxRetries: 2,
    baseDelay: 3000,
    timeout: 5000, // Short timeout - don't wait too long
    jitter: true
  },

  // Mains powered devices should respond quickly
  MAINS_DEVICE: {
    maxRetries: 3,
    baseDelay: 1000,
    timeout: 8000,
    jitter: true
  },

  // Sleepy devices (PIR, door sensors)
  SLEEPY_DEVICE: {
    maxRetries: 1, // Don't retry much - device is sleeping
    baseDelay: 5000,
    timeout: 3000,
    jitter: false
  },

  // Tuya TS0601 devices
  TUYA_TS0601: {
    maxRetries: 2,
    baseDelay: 2000,
    timeout: 8000,
    jitter: true
  }
};

/**
 * Factory method to create a RetryWithBackoff instance with device-appropriate settings
 * @param {Object} device - The Homey device
 * @returns {RetryWithBackoff}
 */
RetryWithBackoff.forDevice = function (device) {
  // Detect device type
  let preset = RetryWithBackoff.PRESETS.MAINS_DEVICE;

  try {
    const data = device.getData ? device.getData() : {};
    const modelId = data.modelId || data.productId || '';
    const manufacturer = data.manufacturerName || '';

    // Check for Tuya TS0601
    if (modelId.toUpperCase() === 'TS0601') {
      preset = RetryWithBackoff.PRESETS.TUYA_TS0601;
    }
    // Check for battery device
    else if (device.hasCapability && device.hasCapability('measure_battery')) {
      // Check if it's a motion/door sensor (very sleepy)
      if (device.hasCapability('alarm_motion') || device.hasCapability('alarm_contact')) {
        preset = RetryWithBackoff.PRESETS.SLEEPY_DEVICE;
      } else {
        preset = RetryWithBackoff.PRESETS.BATTERY_DEVICE;
      }
    }
  } catch (err) {
    // Fall back to default
  }

  return new RetryWithBackoff(device, preset);
};

module.exports = RetryWithBackoff;
