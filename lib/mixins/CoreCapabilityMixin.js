'use strict';

/**
 * CoreCapabilityMixin - v6.1.0
 * 
 * Provides _safeSetCapability and other common helper methods to drivers
 * that might not inherit correctly from BaseHybridDevice.
 */

const CoreCapabilityMixin = {

  /**
   * Safe version of setCapabilityValue with built-in logic
   * @param {string} capability 
   * @param {any} value 
   * @param {object} options 
   */
  async _safeSetCapability(capability, value, options = {}) {
    // If the instance already has a native implementation (from BaseHybridDevice), use it
    const proto = Object.getPrototypeOf(this);
    if (proto && typeof proto._safeSetCapability === 'function' && proto._safeSetCapability !== this._safeSetCapability) {
      return await proto._safeSetCapability.call(this, capability, value, options);
    }

    try {
      if (this._deleted || !this.homey) return false;

      // Basic validation
      if (value === null || value === undefined) return false;

      // Calibration fallback (if driver has calibration methods)
      let finalValue = value;
      if (capability === 'measure_temperature' && typeof this._applyTempOffset === 'function') {
        finalValue = this._applyTempOffset(value);
      } else if (capability === 'measure_humidity' && typeof this._applyHumOffset === 'function') {
        finalValue = this._applyHumOffset(value);
      }

      // Default SDK behavior
      if (!this.hasCapability(capability)) return false;

      await this.setCapabilityValue(capability, finalValue).catch(err => {
        this.error(`[SDK-FALLBACK] Failed to set ${capability}:`, err.message);
      });

      return true;
    } catch (err) {
      if (err.message.includes('destroyed')) return false;
      this.error(`[SAFE-FALLBACK] Error on ${capability}:`, err.message);
      return false;
    }
  }

};

module.exports = CoreCapabilityMixin;
