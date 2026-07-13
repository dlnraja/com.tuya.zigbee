'use strict';
// v9.0.40: Error Classifier - Distinguishes reachability vs attribute errors
// Inspired by gpmachado/com.gpm.homesuite errorUtils.js
// Logs reachability failures at info level to keep logs clean

/**
 * Error categories for different handling
 */
const ERROR_CATEGORY = {
  REACHABILITY: 'reachability',   // Device offline, timeout, network
  ATTRIBUTE: 'attribute',         // Cluster/attribute not found
  PROTOCOL: 'protocol',           // Zigbee protocol errors
  AUTH: 'auth',                   // Authentication/encryption errors
  RESOURCE: 'resource',           // Address table full, routing errors
  TIMEOUT: 'timeout',             // Command/request timeout
  UNKNOWN: 'unknown',
};

/**
 * Classify an error by category
 * @param {Error} err
 * @returns {string} ERROR_CATEGORY value
 */
function classifyError(err) {
  if (!err || !err.message) return ERROR_CATEGORY.UNKNOWN;
  const msg = err.message.toLowerCase();

  // Reachability errors
  if (msg.includes('could not reach device') ||
      msg.includes('[2001]') ||
      msg === '2001' ||
      msg.includes('tuya error: 2001') ||
      msg.includes('timeout') ||
      msg.includes('econnreset') ||
      msg.includes('epipe') ||
      msg.includes('econnrefused') ||
      msg.includes('not connected') ||
      msg.includes('device offline') ||
      msg.includes('no network route') ||
      msg.includes('mac no ack')) {
    return ERROR_CATEGORY.REACHABILITY;
  }

  // Protocol errors
  if (msg.includes('0x87') || // Address table full
      msg.includes('0x8b') || // Broadcast overflow
      msg.includes('0x32') || // Routing error
      msg.includes('0x80') || // Invoked when device is sleeping
      msg.includes('0x81') || // The supplied link key is invalid
      msg.includes('0x82') || // MAC security fail
      msg.includes('0x83') || // Frame too long
      msg.includes('0x84') || // Frame too short
      msg.includes('0x85') || // Missing data
      msg.includes('0x86') || // Buffer full
      msg.includes('0x89') || // Expired
      msg.includes('0x8a') || // Failed to transmit
      msg.includes('0xa1') || // Transaction expired
      msg.includes('0xa2') || // Transaction has expired
      msg.includes('0xa3')) { // Not supported
    return ERROR_CATEGORY.RESOURCE;
  }

  // Attribute errors
  if (msg.includes('attr') ||
      msg.includes('attribute') ||
      msg.includes('cluster') ||
      msg.includes('unsupported') ||
      msg.includes('not found')) {
    return ERROR_CATEGORY.ATTRIBUTE;
  }

  // Auth errors
  if (msg.includes('key') ||
      msg.includes('cipher') ||
      msg.includes('decrypt') ||
      msg.includes('session') ||
      msg.includes('auth')) {
    return ERROR_CATEGORY.AUTH;
  }

  return ERROR_CATEGORY.UNKNOWN;
}

/**
 * Check if error is a reachability issue (device offline)
 * @param {Error} err
 * @returns {boolean}
 */
function isDeviceUnreachable(err) {
  return classifyError(err) === ERROR_CATEGORY.REACHABILITY;
}

/**
 * Check if error is a resource issue (network congestion)
 * @param {Error} err
 * @returns {boolean}
 */
function isResourceError(err) {
  return classifyError(err) === ERROR_CATEGORY.RESOURCE;
}

/**
 * Check if error is retryable
 * @param {Error} err
 * @returns {boolean}
 */
function isRetryable(err) {
  const category = classifyError(err);
  return category === ERROR_CATEGORY.REACHABILITY
    || category === ERROR_CATEGORY.TIMEOUT
    || category === ERROR_CATEGORY.RESOURCE;
}

/**
 * Get retry delay for a retryable error (exponential backoff)
 * @param {number} attempt - Current attempt number (0-based)
 * @param {string} category - Error category from classifyError()
 * @returns {number} Delay in milliseconds
 */
function getRetryDelay(attempt, category) {
  const baseDelays = {
    [ERROR_CATEGORY.REACHABILITY]: 2000,
    [ERROR_CATEGORY.TIMEOUT]: 1000,
    [ERROR_CATEGORY.RESOURCE]: 3000,
    [ERROR_CATEGORY.PROTOCOL]: 5000,
    [ERROR_CATEGORY.AUTH]: 10000,
    [ERROR_CATEGORY.ATTRIBUTE]: 0, // Not retryable
    [ERROR_CATEGORY.UNKNOWN]: 5000,
  };
  const base = baseDelays[category] || 2000;
  return Math.min(base * Math.pow(2, attempt), 60000); // Max 60s
}

/**
 * Execute an async function with automatic retry on retryable errors
 * @param {Function} fn - Async function to execute
 * @param {object} options
 * @param {number} [options.maxRetries=3] - Maximum retry attempts
 * @param {Function} [options.onRetry] - Callback on each retry (err, attempt, delay)
 * @returns {Promise} Result of fn()
 */
async function withRetry(fn, { maxRetries = 3, onRetry = null } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isRetryable(err)) {
        const category = classifyError(err);
        const delay = getRetryDelay(attempt, category);
        if (onRetry) onRetry(err, attempt, delay);
        await new Promise((r) => globalThis.setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw lastError;
}

/**
 * Create a safe error handler for attribute reads
 * Logs reachability at info level, other errors at error level
 * @param {object} device - Homey device instance
 * @param {string} label - Context label for logging
 * @param {object} options
 * @returns {function} Error handler function
 */
function readAttrCatch(device, label, { markOffline = false, markStale = false } = {}) {
  return (err) => {
    const category = classifyError(err);

    switch (category) {
      case ERROR_CATEGORY.REACHABILITY:
        device.log(`${label}: device unreachable (${err.message})`);
        if (markOffline) {
          device.setUnavailable('Device not reachable').catch(() => {});
        }
        break;

      case ERROR_CATEGORY.RESOURCE:
        device.log(`${label}: resource error (${err.message})`);
        // Don't mark offline for temporary network issues
        break;

      case ERROR_CATEGORY.ATTRIBUTE:
        // Attribute not found is expected for some devices
        device.log(`${label}: attribute not available`);
        break;

      default:
        device.error(`${label}:`, err);
        break;
    }
  };
}

/**
 * Create a safe error handler for attribute writes
 * @param {object} device - Homey device instance
 * @param {string} label - Context label
 * @returns {function} Error handler function
 */
function writeAttrCatch(device, label) {
  return (err) => {
    const category = classifyError(err);

    if (category === ERROR_CATEGORY.REACHABILITY) {
      device.log(`${label}: write failed - device unreachable`);
      device.setUnavailable('Device not reachable').catch(() => {});
    } else {
      device.error(`${label}: write failed:`, err);
    }
  };
}

module.exports = {
  ERROR_CATEGORY,
  classifyError,
  isDeviceUnreachable,
  isResourceError,
  isRetryable,
  getRetryDelay,
  withRetry,
  readAttrCatch,
  writeAttrCatch,
};
