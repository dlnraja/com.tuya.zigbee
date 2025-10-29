'use strict';

/**
 * PromiseUtils - Safe promise handling utilities
 * Prevents "Cannot read properties of undefined (reading 'catch')" errors
 */
class PromiseUtils {
  
  /**
   * Safely await a value that might or might not be a promise
   * @param {*} maybePromise - Value that might be a promise
   * @param {Object} ctx - Context for logging (optional)
   * @param {String} label - Label for logging (optional)
   * @returns {Promise<*>} Resolved value or undefined on error
   */
  static async safeAwait(maybePromise, ctx = null, label = '') {
    try {
      // Check if it's a promise
      if (maybePromise && typeof maybePromise.then === 'function') {
        return await maybePromise;
      }
      
      // Not a promise, return as-is
      return maybePromise;
    } catch (err) {
      if (ctx?.error) {
        ctx.error(`[PromiseUtils] ${label} failed:`, err.message);
      }
      return undefined;
    }
  }
  
  /**
   * Safely call .catch() on a value that might not be a promise
   * @param {*} maybePromise - Value that might be a promise
   * @param {Function} catchHandler - Error handler
   * @returns {*} Original value or result of catch
   */
  static safeCatch(maybePromise, catchHandler) {
    if (maybePromise && typeof maybePromise.catch === 'function') {
      return maybePromise.catch(catchHandler);
    }
    return maybePromise;
  }
  
  /**
   * Wrap a function call to always return a promise
   * @param {Function} fn - Function to call
   * @param {Array} args - Arguments
   * @returns {Promise}
   */
  static async promisify(fn, ...args) {
    try {
      const result = fn(...args);
      if (result && typeof result.then === 'function') {
        return await result;
      }
      return result;
    } catch (err) {
      throw err;
    }
  }
  
  /**
   * Execute function with timeout
   * @param {Function} fn - Async function
   * @param {Number} timeoutMs - Timeout in milliseconds
   * @param {String} label - Label for error message
   * @returns {Promise}
   */
  static async withTimeout(fn, timeoutMs, label = 'Operation') {
    return Promise.race([
      fn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${label} timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}

module.exports = PromiseUtils;
