'use strict';

/**
 * CapabilityFallbackManager
 * 
 * Provides robust fallback, sanitization, and interception for setCapabilityValue
 * to protect Homey SDK from raw Zigbee anomalies, rogue data (e.g. 9999 values),
 * and missing capabilities on multi-variant devices.
 */
class CapabilityFallbackManager {

  /**
   * Sanitizes and validates a capability value before passing it to Homey core
   * 
   * @param {string} capabilityId - The capability ID
   * @param {any} value - The raw value from Zigbee
   * @param {object} device - The device context (for logging)
   * @returns {any} Sanitized value, or undefined if it should be dropped
   */
  static sanitizeValue(capabilityId, value, device) {
    if (value === null || value === undefined) {
      if (device) device.log(`[CAP-FALLBACK] Dropping null/undefined value for ${capabilityId}`);
      return undefined;
    }

    let val = value;

    // Handle Booleans
    if (capabilityId.startsWith('alarm_') || capabilityId === 'onoff' || capabilityId.endsWith('.led')) {
      return Boolean(val);
    }

    // Handle Numbers
    if (capabilityId.startsWith('measure_') || capabilityId.startsWith('meter_') || capabilityId === 'dim') {
      if (typeof val !== 'number') {
        val = parseFloat(val);
      }

      if (isNaN(val) || !isFinite(val)) {
        if (device) device.log(`[CAP-FALLBACK] Dropping NaN value for ${capabilityId}`);
        return undefined;
      }

      // Tuya often sends 0xFFFF (65535) or similar high values when sensor is in error state
      if (val > 30000) {
        if (device) device.log(`[CAP-FALLBACK] Dropping impossibly high value (${val}) for ${capabilityId}`);
        return undefined;
      }

      // Specific Clamping
      if (capabilityId === 'measure_humidity' || capabilityId === 'measure_battery') {
        if (val < 0) val = 0;
        if (val > 100) val = 100;
      } else if (capabilityId === 'dim') {
        if (val < 0) val = 0;
        if (val > 1) val = 1;
      } else if (capabilityId === 'measure_temperature') {
        if (val < -100) val = -100;
        if (val > 1000) val = 1000;
      }
    }

    return val;
  }

  /**
   * Injects the safe interceptor into the target device instance
   * 
   * @param {object} device - The device instance inheriting Homey.Device
   */
  static inject(device) {
    if (device._capabilityFallbackInjected) return;

    // Save the original method
    const originalSetCapabilityValue = device.setCapabilityValue.bind(device);

    // Override with safe proxy
    device.setCapabilityValue = async function (capabilityId, value) {
      // 1. Variant Fallback: Check if the device actually has this capability
      if (!this.hasCapability(capabilityId)) {
        // We log silently and drop it. This handles multi-variant MFS 
        // where a 2-gang switch receives 3-gang messages, or a sensor lacks humidity.
        // this.log(`[CAP-FALLBACK] Skipped ${capabilityId} (not in device compose)`);
        return Promise.resolve(); // Fail gracefully
      }

      // 2. Data Sanitization & Range Validation
      const sanitizedValue = CapabilityFallbackManager.sanitizeValue(capabilityId, value, this);
      
      // If the sanitization dropped the value, abort update
      if (sanitizedValue === undefined) {
        return Promise.resolve();
      }

      // 3. Execution & Crash Prevention
      try {
        return originalSetCapabilityValue(capabilityId, sanitizedValue)
          .catch(err => {
            this.log(`[CAP-FALLBACK] Handled internal SDK error for ${capabilityId}: ${err.message}`);
          });
      } catch (err) {
        this.log(`[CAP-FALLBACK] Intercepted synchronous error for ${capabilityId}: ${err.message}`);
        return Promise.resolve();
      }
    };

    device._capabilityFallbackInjected = true;
    device.log('[CAP-FALLBACK] Manager successfully injected');
  }

}

module.exports = CapabilityFallbackManager;
