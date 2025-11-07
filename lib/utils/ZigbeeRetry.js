'use strict';

/**
 * Zigbee Retry Utilities
 * Handles "Zigbee est en cours de démarrage" and other transient errors
 */

/**
 * Retry a Zigbee operation with exponential backoff
 * @param {Function} operation - Async function to retry
 * @param {Object} options - Retry options
 * @returns {Promise<any>} Result or null if all retries failed
 */
async function retryZigbeeOperation(operation, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    logger = null
  } = options;

  let lastError = null;
  let delay = initialDelay;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await operation();
      
      if (attempt > 1 && logger) {
        logger(`✅ Zigbee operation succeeded on attempt ${attempt}`);
      }
      
      return result;
    } catch (err) {
      lastError = err;
      
      // Check if it's a transient error that can be retried
      const isTransient = isTransientZigbeeError(err);
      
      if (!isTransient || attempt === maxRetries) {
        if (logger) {
          logger(`❌ Zigbee operation failed after ${attempt} attempts: ${err.message}`);
        }
        break;
      }
      
      // Wait before retry
      if (logger) {
        logger(`⏳ Zigbee operation failed (attempt ${attempt}/${maxRetries}), retrying in ${delay}ms: ${err.message}`);
      }
      
      await sleep(delay);
      
      // Exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }
  
  // All retries failed, return null or throw
  return null;
}

/**
 * Check if a Zigbee error is transient and can be retried
 * @param {Error} error - Error to check
 * @returns {boolean} True if error is transient
 */
function isTransientZigbeeError(error) {
  if (!error || !error.message) return false;
  
  const transientMessages = [
    'Zigbee est en cours de démarrage',
    'Zigbee is starting',
    'Timeout: Expected Response',
    'Request timed out',
    'Network busy',
    'MAC no ack',
    'Delivery failed',
    'No network route',
    'APS no ack'
  ];
  
  return transientMessages.some(msg => 
    error.message.includes(msg)
  );
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Safely configure reporting with retries
 * @param {Object} cluster - Cluster object
 * @param {Object} config - Reporting configuration
 * @param {Object} options - Retry options
 * @returns {Promise<boolean>} Success status
 */
async function safeConfigureReportingWithRetry(cluster, config = {}, options = {}) {
  if (!cluster || typeof cluster.configureReporting !== 'function') {
    return false;
  }
  
  const operation = async () => {
    await cluster.configureReporting(config);
    return true;
  };
  
  const result = await retryZigbeeOperation(operation, {
    maxRetries: 3,
    initialDelay: 2000,  // Start with 2s delay
    maxDelay: 8000,
    logger: options.logger || null
  });
  
  return result === true;
}

/**
 * Safely read attributes with retries
 * @param {Object} cluster - Cluster object
 * @param {Array<string>} attrs - Attributes to read
 * @param {Object} options - Retry options
 * @returns {Promise<Object|null>} Attribute results or null
 */
async function safeReadAttributesWithRetry(cluster, attrs = [], options = {}) {
  if (!cluster || typeof cluster.readAttributes !== 'function') {
    return null;
  }
  
  const operation = async () => {
    return await cluster.readAttributes(attrs);
  };
  
  return await retryZigbeeOperation(operation, {
    maxRetries: 2,  // Fewer retries for reads
    initialDelay: 1000,
    maxDelay: 5000,
    logger: options.logger || null
  });
}

/**
 * Specialized wrapper for configureReporting with retry
 * Direct replacement for cluster.configureReporting() calls
 * 
 * @param {Object} cluster - Zigbee cluster instance
 * @param {string} attribute - Attribute name (e.g., 'onOff')
 * @param {Object} options - Reporting options
 * @param {number} maxRetries - Maximum retry attempts
 * @param {Function} logger - Optional logger function
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
async function configureReportingWithRetry(cluster, attribute, options, maxRetries = 5, logger = null) {
  const baseDelay = 1000; // 1s
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      await cluster.configureReporting(attribute, options);
      
      if (attempt > 0 && logger) {
        logger(`[ZIGBEE-RETRY] ✅ configureReporting succeeded on attempt ${attempt + 1}`);
      }
      
      return true;
    } catch (err) {
      attempt++;
      
      // Check if it's "Zigbee est en cours de démarrage" or similar
      const isStartupError = err.message?.includes('en cours de démarrage') ||
                            err.message?.includes('starting up') ||
                            err.message?.includes('not ready');
      
      if (!isStartupError && !isTransientZigbeeError(err)) {
        // Not a transient error, fail immediately
        if (logger) {
          logger(`[ZIGBEE-RETRY] ❌ configureReporting failed with non-transient error: ${err.message}`);
        }
        return false;
      }
      
      if (attempt >= maxRetries) {
        if (logger) {
          logger(`[ZIGBEE-RETRY] ❌ All ${maxRetries} retries failed for configureReporting`);
        }
        return false;
      }
      
      // Exponential backoff: 1s, 2s, 4s, 8s, 16s
      const wait = baseDelay * Math.pow(2, attempt);
      
      if (logger) {
        logger(`[ZIGBEE-RETRY] ⏳ Attempt ${attempt}/${maxRetries} failed: ${err.message}. Retrying in ${wait}ms`);
      }
      
      await sleep(wait);
    }
  }
  
  return false;
}

module.exports = {
  retryZigbeeOperation,
  isTransientZigbeeError,
  sleep,
  safeConfigureReportingWithRetry,
  safeReadAttributesWithRetry,
  configureReportingWithRetry
};
