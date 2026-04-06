'use strict';

/**
 * CapabilityManagerMixin - v6.0.0
 * 
 * Centralized, robust capability management for all Tuya Zigbee devices.
 * Provides _safeSetCapability to ensure:
 * 1. Throttling (prevents spamming Homey)
 * 2. Calibration (applies temp/humidity offsets)
 * 3. Blocking (prevents bizarre values from reaching flows)
 * 4. Dynamic addition (adds capability if missing but reported)
 * 5. Error handling (catches SDK errors and destroys timeouts)
 */

const THRESHOLDS = {
  measure_temperature: { min: -40, max: 80, maxJump: 10 },
  measure_humidity: { min: 0, max: 100, maxJump: 30 },
  measure_battery: { min: 0, max: 100, significantChange: 1 },
};

const CapabilityManagerMixin = {

  /**
   * Safe version of setCapabilityValue with built-in logic
   * @param {string} capability 
   * @param {any} value 
   */
  async _safeSetCapability(capability, value) {
    try {
      // 1. Initial validation
      if (value === null || value === undefined) return;
      
      let finalValue = value;

      // 2. Specialized handling for sensors
      if (capability === 'measure_temperature') {
        const offset = this.temperatureOffset || 0;
        finalValue = parseFloat((value + offset).toFixed(2));
        if (finalValue < THRESHOLDS.measure_temperature.min || finalValue > THRESHOLDS.measure_temperature.max) {
          this.log(`[CAP-SAFETY] Blocked bizarre temperature: ${finalValue}°C`);
          return;
        }
      } else if (capability === 'measure_humidity') {
        const offset = this.humidityOffset || 0;
        finalValue = Math.round(Math.max(0, Math.min(100, value + offset)));
      } else if (capability === 'measure_battery') {
        finalValue = Math.round(Math.max(0, Math.min(100, value)));
        const current = this.getCapabilityValue('measure_battery');
        if (current !== null && Math.abs(current - finalValue) < THRESHOLDS.measure_battery.significantChange) {
          // Skip insignificant battery changes to save radio/flows
          return;
        }
      }

      // 3. Check if capability exists, if not, try to add it (for dynamic devices)
      if (!this.hasCapability(capability)) {
        this.log(`[CAP-SAFETY] reported '${capability}' but device doesn't have it. Attempting dynamic add...`);
        try {
          await this.addCapability(capability);
        } catch (e) {
          this.error(`[CAP-SAFETY] Failed to dynamically add capability ${capability}:`, e.message);
          return;
        }
      }

      // 4. Final update
      await this.setCapabilityValue(capability, finalValue);
      
      // 5. Special logic for battery (store for later use)
      if (capability === 'measure_battery') {
        if (typeof this.setStoreValue === 'function') {
          this.setStoreValue('last_battery_update', Date.now());
        }
      }

    } catch (err) {
      if (err.message.includes('destroyed')) return;
      this.error(`[CAP-SAFETY] error setting ${capability}:`, err.message);
    }
  }

};

module.exports = CapabilityManagerMixin;
