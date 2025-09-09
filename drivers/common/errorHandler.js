'use strict';

class ErrorHandler {
  /**
   * Handles and logs errors that occur during device operations.
   * @param {import('homey').Device} device - The device instance where the error occurred.
   * @param {Error} error - The error object.
   * @param {string} context - A string describing the context of the error (e.g., 'initialization', 'polling').
   */
  static handleDeviceError(device, error, context) {
    const deviceId = device.getData().id || 'unknown';
    const deviceName = device.getName() || 'Unknown Device';

    device.error(`[${context}] Error on device ${deviceName} (${deviceId}):`, error.message);
    device.debug(error.stack);

    // Optionally, set the device as unavailable
    // device.setUnavailable(`Error during ${context}: ${error.message}`).catch(e => device.error('Failed to set device unavailable', e));
  }
}

module.exports = ErrorHandler;
