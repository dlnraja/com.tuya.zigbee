'use strict';

/**
 * ZigbeeTimeout - Utility for adding timeouts to Zigbee operations
 * Prevents infinite hangs when devices don't respond
 */
class ZigbeeTimeout {
  
  /**
   * Wrap a promise with a timeout
   * @param {Promise} promise - The promise to wrap
   * @param {number} ms - Timeout in milliseconds
   * @param {string} operation - Description for error message
   * @returns {Promise} Wrapped promise that rejects on timeout
   */
  static withTimeout(promise, ms = 5000, operation = 'Operation') {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${operation} timed out after ${ms}ms`)), ms)
      )
    ]);
  }

  /**
   * Wrap a promise with timeout and default value on failure
   * @param {Promise} promise - The promise to wrap
   * @param {*} defaultValue - Value to return on timeout or error
   * @param {number} ms - Timeout in milliseconds
   * @param {string} operation - Description for logging
   * @returns {Promise} Wrapped promise that resolves to defaultValue on failure
   */
  static withTimeoutAndDefault(promise, defaultValue, ms = 5000, operation = 'Operation') {
    return Promise.resolve(this.withTimeout(promise, ms, operation)).catch(() => defaultValue);
  }

  /**
   * Read attributes with automatic timeout
   * @param {Object} cluster - Zigbee cluster object
   * @param {Array|string} attributes - Attribute(s) to read
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} Attribute values or null on timeout
   */
  static async readAttributes(cluster, attributes, timeout = 5000) {
    const attrList = Array.isArray(attributes) ? attributes : [attributes];
    const operation = `Read attributes [${attrList.join(', ')}]`;
    
    return this.withTimeoutAndDefault(
      cluster.readAttributes(attrList),
      null,
      timeout,
      operation
    );
  }

  /**
   * Configure attribute reporting with automatic timeout
   * @param {Function} configFn - Configuration function to call
   * @param {Array} config - Reporting configuration
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Promise} void or null on timeout
   */
  static async configureReporting(configFn, config, timeout = 10000) {
    const operation = `Configure reporting for ${config.length} attribute(s)`;
    
    return this.withTimeoutAndDefault(
      configFn(config),
      null,
      timeout,
      operation
    );
  }

  /**
   * Execute multiple operations with individual timeouts
   * Returns partial results even if some fail
   * @param {Array<Promise>} operations - Array of promises
   * @param {number} timeout - Timeout for each operation
   * @returns {Promise<Array>} Array of results (null for failed operations)
   */
  static async executeWithPartialSuccess(operations, timeout = 5000) {
    return Promise.all(
      operations.map(op => 
        this.withTimeoutAndDefault(op, null, timeout, 'Operation')
      )
    );
  }
}

module.exports = ZigbeeTimeout;
