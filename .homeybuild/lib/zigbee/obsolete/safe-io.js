'use strict';

/**
 * Safe I/O wrapper with retry logic for Zigbee operations
 * Handles "Timeout: Expected Response" and other transient errors
 * 
 * @param {Function} fn - Async function to execute with retry
 * @param {Object} options - Configuration options
 * @param {number} options.tries - Number of attempts (default: 3)
 * @param {number} options.backoffMs - Initial backoff delay in ms (default: 250)
 * @param {number} options.backoffMultiplier - Backoff multiplier for exponential backoff (default: 2)
 * @param {Object} options.device - Device instance for logging (optional)
 * @returns {Promise<any>} - Result from function
 * @throws {Error} - Throws last error if all retries fail
 */
async function withRetry(fn, { 
  tries = 3, 
  backoffMs = 250, 
  backoffMultiplier = 2,
  device = null 
} = {}) {
  let lastError;
  let currentBackoff = backoffMs;
  
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const result = await fn().catch(err => this.error(err));
      
      if (device && attempt > 1) {
        device.log(`[OK] Retry succeeded on attempt ${attempt}/${tries}`);
      }
      
      return result;
      
    } catch (err) {
      lastError = err;
      
      // Check if error is retryable
      const isRetryable = isRetryableError(err);
      
      if (!isRetryable || attempt === tries) {
        // Don't retry if not retryable or last attempt
        if (device) {
          device.error(`[ERROR] Operation failed (attempt ${attempt}/${tries}):`, err.message);
        }
        throw err;
      }
      
      // Log retry attempt
      if (device) {
        device.log(`[WARN] Retrying after error (attempt ${attempt}/${tries}): ${err.message}`);
        device.log(`   Waiting ${currentBackoff}ms before retry...`);
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, currentBackoff)).catch(err => this.error(err));
      currentBackoff *= backoffMultiplier;
    }
  }
  
  // All retries failed
  throw lastError;
}

/**
 * Determine if an error is retryable
 * @param {Error} err - Error to check
 * @returns {boolean} - True if error should be retried
 */
function isRetryableError(err) {
  const retryablePatterns = [
    'timeout',
    'expected response',
    'no response',
    'busy',
    'network error',
    'unreachable',
    'en cours de démarrage', // "Zigbee is starting"
    'not ready'
  ];
  
  const errorMessage = (err.message || '').toLowerCase();
  
  return retryablePatterns.some(pattern => errorMessage.includes(pattern));
}

/**
 * Safe read attributes with retry
 * @param {Object} cluster - Zigbee cluster
 * @param {Array<string>} attributes - Attribute names to read
 * @param {Object} options - Retry options
 * @returns {Promise<Object>} - Attribute values
 */
async function safeReadAttributes(cluster, attributes, options = {}) {
  return withRetry(
    () => cluster.readAttributes(attributes),
    options
  );
}

/**
 * Safe write attributes with retry
 * @param {Object} cluster - Zigbee cluster
 * @param {Object} attributes - Attributes to write
 * @param {Object} options - Retry options
 * @returns {Promise<void>}
 */
async function safeWriteAttributes(cluster, attributes, options = {}) {
  return withRetry(
    () => cluster.writeAttributes(attributes),
    options
  );
}

/**
 * Safe command execution with retry
 * @param {Object} cluster - Zigbee cluster
 * @param {string} command - Command name
 * @param {Object} args - Command arguments
 * @param {Object} options - Retry options
 * @returns {Promise<any>} - Command result
 */
async function safeCommand(cluster, command, args = {}, options = {}) {
  return withRetry(
    () => cluster[command](args),
    options
  );
}

module.exports = {
  withRetry,
  isRetryableError,
  safeReadAttributes,
  safeWriteAttributes,
  safeCommand
};
