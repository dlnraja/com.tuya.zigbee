'use strict';

/**
 * CrashPrevention - Comprehensive crash prevention utilities
 *
 * Provides:
 *   - safeAsync: Wraps async functions with error handling
 *   - safePromise: Wraps promises with error handling
 *   - guardDestroyed: Prevents execution on destroyed devices
 *   - guardHomey: Prevents execution when homey is unavailable
 *   - safeTimeout: Creates timeouts that check _destroyed flag
 *   - safeInterval: Creates intervals that check _destroyed flag
 *   - wrapListener: Wraps event listeners with error handling
 *   - safeCleanup: Safely cleans up resources
 *
 * Usage:
 *   const CrashPrevention = require('./CrashPrevention');
 *
 *   // Wrap async function
 *   const safeFn = CrashPrevention.safeAsync(myAsyncFn, this);
 *
 *   // Guard against destroyed device
 *   CrashPrevention.guardDestroyed(this, () => {
 *     // Safe to execute
 *   });
 *
 *   // Create safe timeout
 *   const timer = CrashPrevention.safeTimeout(this, () => {
 *     // Safe to execute after delay
 *   }, 1000);
 */

class CrashPrevention {
  /**
   * Wrap an async function with error handling
   * @param {Function} fn - Async function to wrap
   * @param {Object} context - Context for logging (device or app)
   * @param {string} [label] - Label for error messages
   * @returns {Function} Wrapped function
   */
  static safeAsync(fn, context, label = 'CrashPrevention') {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (err) {
        if (context && typeof context.error === 'function') {
          context.error(`[${label}] Error:`, err.message);
        }
        return null;
      }
    };
  }

  /**
   * Wrap a promise with error handling
   * @param {Promise} promise - Promise to wrap
   * @param {Object} context - Context for logging (device or app)
   * @param {string} [label] - Label for error messages
   * @returns {Promise} Wrapped promise
   */
  static safePromise(promise, context, label = 'CrashPrevention') {
    return promise.catch(err => {
      if (context && typeof context.error === 'function') {
        context.error(`[${label}] Promise rejected:`, err.message);
      }
      return null;
    });
  }

  /**
   * Guard against execution on destroyed devices
   * @param {Object} device - Device to check
   * @param {Function} fn - Function to execute
   * @returns {*} Result of fn or null if destroyed
   */
  static guardDestroyed(device, fn) {
    if (!device || device._destroyed) {
      return null;
    }
    return fn();
  }

  /**
   * Guard against execution when homey is unavailable
   * @param {Object} device - Device to check
   * @param {Function} fn - Function to execute
   * @returns {*} Result of fn or null if homey unavailable
   */
  static guardHomey(device, fn) {
    if (!device || !device.homey) {
      return null;
    }
    return fn();
  }

  /**
   * Create a safe timeout that checks _destroyed flag
   * @param {Object} device - Device to check
   * @param {Function} fn - Function to execute
   * @param {number} delay - Delay in milliseconds
   * @returns {Object} Timeout object
   */
  static safeTimeout(device, fn, delay) {
    if (!device || !device.homey) {
      return null;
    }

    return device.homey.setTimeout(() => {
      if (device._destroyed) {
        return;
      }
      try {
        fn();
      } catch (err) {
        if (typeof device.error === 'function') {
          device.error('[CrashPrevention] Timeout error:', err.message);
        }
      }
    }, delay);
  }

  /**
   * Create a safe interval that checks _destroyed flag
   * @param {Object} device - Device to check
   * @param {Function} fn - Function to execute
   * @param {number} interval - Interval in milliseconds
   * @returns {Object} Interval object
   */
  static safeInterval(device, fn, interval) {
    if (!device || !device.homey) {
      return null;
    }

    return device.homey.setInterval(() => {
      if (device._destroyed) {
        return;
      }
      try {
        fn();
      } catch (err) {
        if (typeof device.error === 'function') {
          device.error('[CrashPrevention] Interval error:', err.message);
        }
      }
    }, interval);
  }

  /**
   * Wrap an event listener with error handling
   * @param {Object} emitter - EventEmitter to listen to
   * @param {string} event - Event name
   * @param {Function} listener - Listener function
   * @param {Object} context - Context for logging (device or app)
   * @returns {Function} Wrapped listener
   */
  static wrapListener(emitter, event, listener, context) {
    const wrappedListener = (...args) => {
      try {
        listener(...args);
      } catch (err) {
        if (context && typeof context.error === 'function') {
          context.error(`[CrashPrevention] Listener error on ${event}:`, err.message);
        }
      }
    };

    emitter.on(event, wrappedListener);
    return wrappedListener;
  }

  /**
   * Safely cleanup resources
   * @param {Object} resource - Resource to cleanup
   * @param {string} name - Resource name for logging
   * @param {Object} context - Context for logging (device or app)
   */
  static safeCleanup(resource, name, context) {
    if (!resource) {
      return;
    }

    try {
      if (typeof resource.destroy === 'function') {
        resource.destroy();
      } else if (typeof resource.cleanup === 'function') {
        resource.cleanup();
      } else if (typeof resource.close === 'function') {
        resource.close();
      }
    } catch (err) {
      if (context && typeof context.error === 'function') {
        context.error(`[CrashPrevention] Cleanup error for ${name}:`, err.message);
      }
    }
  }

  /**
   * Safely clear a timeout
   * @param {Object} device - Device with homey
   * @param {Object} timer - Timeout to clear
   */
  static clearTimeout(device, timer) {
    if (!timer) {
      return;
    }

    try {
      if (device && device.homey) {
        device.homey.clearTimeout(timer);
      } else {
        clearTimeout(timer);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  /**
   * Safely clear an interval
   * @param {Object} device - Device with homey
   * @param {Object} interval - Interval to clear
   */
  static clearInterval(device, interval) {
    if (!interval) {
      return;
    }

    try {
      if (device && device.homey) {
        device.homey.clearInterval(interval);
      } else {
        clearInterval(interval);
      }
    } catch (err) {
      // Ignore cleanup errors
    }
  }

  /**
   * Wrap a capability listener with error handling
   * @param {Object} device - Device to listen on
   * @param {string} capability - Capability ID
   * @param {Function} listener - Listener function
   * @returns {Function} Wrapped listener
   */
  static wrapCapabilityListener(device, capability, listener) {
    return device.registerCapabilityListener(capability, async (...args) => {
      try {
        return await listener(...args);
      } catch (err) {
        if (typeof device.error === 'function') {
          device.error(`[CrashPrevention] Capability listener error for ${capability}:`, err.message);
        }
        return null;
      }
    });
  }

  /**
   * Safely execute a function with retry logic
   * @param {Function} fn - Function to execute
   * @param {Object} options - Options
   * @param {number} [options.maxRetries=3] - Maximum retries
   * @param {number} [options.delay=1000] - Delay between retries
   * @param {Object} [options.context] - Context for logging
   * @returns {Promise<*>} Result of fn
   */
  static async withRetry(fn, options = {}) {
    const { maxRetries = 3, delay = 1000, context } = options;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        if (context && typeof context.warn === 'function') {
          context.warn(`[CrashPrevention] Attempt ${attempt}/${maxRetries} failed:`, err.message);
        }
        if (attempt < maxRetries) {
          await new Promise(resolve => globalThis.setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Create a safe wrapper for device initialization
   * @param {Object} device - Device to initialize
   * @param {Function} initFn - Initialization function
   * @returns {Promise<boolean>} True if initialization succeeded
   */
  static async safeInit(device, initFn) {
    try {
      if (device._destroyed) {
        return false;
      }
      await initFn();
      return true;
    } catch (err) {
      if (typeof device.error === 'function') {
        device.error('[CrashPrevention] Initialization error:', err.message);
      }
      return false;
    }
  }

  /**
   * Create a safe wrapper for device deletion
   * @param {Object} device - Device to delete
   * @param {Function} deleteFn - Deletion function
   * @returns {Promise<boolean>} True if deletion succeeded
   */
  static async safeDelete(device, deleteFn) {
    try {
      device._destroyed = true;
      await deleteFn();
      return true;
    } catch (err) {
      if (typeof device.error === 'function') {
        device.error('[CrashPrevention] Deletion error:', err.message);
      }
      return false;
    }
  }

  /**
   * Create a safe wrapper for capability value setting
   * @param {Object} device - Device to set capability on
   * @param {string} capability - Capability ID
   * @param {*} value - Value to set
   * @returns {Promise<boolean>} True if value was set
   */
  static async safeSetCapability(device, capability, value) {
    try {
      if (device._destroyed || !device.homey) {
        return false;
      }
      await device.setCapabilityValue(capability, value);
      return true;
    } catch (err) {
      if (typeof device.error === 'function') {
        device.error(`[CrashPrevention] Failed to set ${capability}:`, err.message);
      }
      return false;
    }
  }

  /**
   * Create a safe wrapper for flow card triggering
   * @param {Object} device - Device to trigger flow on
   * @param {Object} flowCard - Flow card to trigger
   * @param {Object} tokens - Flow tokens
   * @param {Object} state - Flow state
   * @returns {Promise<boolean>} True if flow was triggered
   */
  static async safeTriggerFlow(device, flowCard, tokens = {}, state = {}) {
    try {
      if (device._destroyed || !device.homey) {
        return false;
      }
      await flowCard.trigger(device, tokens, state);
      return true;
    } catch (err) {
      if (typeof device.error === 'function') {
        device.error('[CrashPrevention] Failed to trigger flow:', err.message);
      }
      return false;
    }
  }

  /**
   * Create a safe wrapper for sending Zigbee commands
   * @param {Object} device - Device to send command on
   * @param {Object} cluster - Zigbee cluster
   * @param {string} command - Command name
   * @param {Object} data - Command data
   * @returns {Promise<boolean>} True if command was sent
   */
  static async safeSendCommand(device, cluster, command, data = {}) {
    try {
      if (device._destroyed || !device.homey) {
        return false;
      }
      await cluster[command](data);
      return true;
    } catch (err) {
      if (typeof device.error === 'function') {
        device.error(`[CrashPrevention] Failed to send ${command}:`, err.message);
      }
      return false;
    }
  }
}

module.exports = CrashPrevention;
