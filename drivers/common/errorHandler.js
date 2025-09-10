'use strict';

const { EventEmitter } = require('events');
const { DEFAULT_SETTINGS } = require('./constants');

/**
 * @typedef {import('homey').Device} HomeyDevice
 * @typedef {import('homey-zigbeedriver').ZigBeeDevice} ZigBeeDevice
 */

/**
 * Enhanced error handling and recovery for Zigbee devices
 */
class ErrorHandler extends EventEmitter {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.maxRetries - Maximum number of retry attempts
   * @param {number} options.retryDelay - Delay between retries in milliseconds
   */
  constructor(options = {}) {
    super();
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 5000;
    this.retryCounts = new Map();
  }

  /**
   * Handles and logs errors that occur during device operations
   * @param {HomeyDevice|ZigBeeDevice} device - The device instance
   * @param {Error} error - The error object
   * @param {string} context - Context where the error occurred
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.recoverable=true] - Whether the error is recoverable
   * @param {Function} [options.recoveryFn] - Function to call for recovery
   * @returns {Promise<boolean>} True if error was handled successfully
   */
  async handleDeviceError(device, error, context, options = {}) {
    const {
      recoverable = true,
      recoveryFn,
      maxRetries = this.maxRetries,
      retryDelay = this.retryDelay,
    } = options;

    const deviceId = device.getData?.()?.id || 'unknown';
    const deviceName = device.getName?.() || 'Unknown Device';
    const errorId = `${deviceId}-${context}`;
    const retryCount = (this.retryCounts.get(errorId) || 0) + 1;
    
    // Update retry count
    this.retryCounts.set(errorId, retryCount);

    // Log the error with context
    this._logError(device, error, context, deviceName, deviceId, retryCount);

    // Handle unrecoverable errors
    if (!recoverable || retryCount >= maxRetries) {
      await this._handleCriticalError(device, error, context);
      return false;
    }

    // Attempt recovery
    try {
      if (recoveryFn && typeof recoveryFn === 'function') {
        await recoveryFn();
      } else {
        await this._defaultRecovery(device, context);
      }
      
      this.retryCounts.delete(errorId); // Reset retry count on success
      return true;
    } catch (recoveryError) {
      device.error(`[${context}] Recovery attempt ${retryCount} failed:`, recoveryError.message);
      
      // Schedule retry if we haven't exceeded max retries
      if (retryCount < maxRetries) {
        setTimeout(() => {
          this.handleDeviceError(device, error, context, options);
        }, retryDelay);
      } else {
        await this._handleCriticalError(device, error, context);
      }
      
      return false;
    }
  }

  /**
   * Logs error with context and stack trace
   * @private
   */
  _logError(device, error, context, deviceName, deviceId, retryCount) {
    const errorMessage = `[${context}] Error on ${deviceName} (${deviceId}) [Attempt ${retryCount}]: ${error.message}`;
    
    device.error(errorMessage);
    device.debug('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      context,
      timestamp: new Date().toISOString()
    });

    // Emit error event for external handling
    this.emit('error', {
      device,
      error,
      context,
      deviceId,
      deviceName,
      timestamp: Date.now(),
      retryCount
    });
  }

  /**
   * Default recovery strategy
   * @private
   */
  async _defaultRecovery(device, context) {
    // Try to reinitialize the device
    if (typeof device.onNodeInit === 'function') {
      device.log(`[${context}] Attempting to reinitialize device...`);
      await device.onNodeInit({ zclNode: device.zclNode });
    }
  }

  /**
   * Handles critical errors that cannot be recovered from
   * @private
   */
  async _handleCriticalError(device, error, context) {
    const deviceId = device.getData?.()?.id || 'unknown';
    const deviceName = device.getName?.() || 'Unknown Device';
    
    device.error(`[${context}] Critical error on ${deviceName} (${deviceId}):`, error.message);
    
    // Mark device as unavailable
    try {
      if (typeof device.setUnavailable === 'function') {
        await device.setUnavailable(`Error: ${error.message}`);
      }
    } catch (e) {
      device.error('Failed to set device as unavailable:', e);
    }
    
    // Reset retry counter for this error
    this.retryCounts.delete(`${deviceId}-${context}`);
    
    // Emit critical error event
    this.emit('criticalError', {
      device,
      error,
      context,
      deviceId,
      deviceName,
      timestamp: Date.now()
    });
  }
}

// Create a singleton instance
const errorHandler = new ErrorHandler({
  maxRetries: DEFAULT_SETTINGS.max_retries || 3,
  retryDelay: (DEFAULT_SETTINGS.retry_delay_seconds || 5) * 1000,
});

// Export both the class and the singleton instance
module.exports = {
  ErrorHandler,
  errorHandler,
  // Backward compatibility
  handleDeviceError: (device, error, context) => 
    errorHandler.handleDeviceError(device, error, context)
};
