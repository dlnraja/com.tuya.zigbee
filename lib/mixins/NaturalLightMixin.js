'use strict';
const { safeParse } = require('../utils/tuyaUtils.js');


/**
 * NaturalLightMixin - v1.0.0
 * 
 * Automatically adjusts color temperature (light_temperature) of lighting devices
 * based on the current time of day to simulate the natural solar cycle (Adaptive Lighting).
 * 
 * Part of v7.2.0 "Autonomous Awakening" update.
 */
// A8: NaN Safety - use safeDivide/safeMultiply
  const NaturalLightMixin = {

  /**
   * Initialize natural light sync
   */
  _initNaturalLight() {
    this._naturalLightActive = this.getSettings().enable_natural_light === true;
    if (!this._naturalLightActive) return;

    this.log('[NATURAL-LIGHT]  Initializing autonomous solar sync...');
    
    // Start sync timer (every 15 minutes)
    this._naturalLightTimer = this.setInterval(() => {
      this._applyNaturalLight();
    }, 900000);

    // Immediate application
    this._applyNaturalLight();
  },

  /**
   * Calculate and apply solar color temperature
   */
  async _applyNaturalLight() {
    if (!this._naturalLightActive) return;

    // Ensure capability exists and device is ON
    if (!this.hasCapability('light_temperature') || !this.getCapabilityValue('onoff')) {
      return;
    }

    const now = new Date();
    const hour = now.getHours() + safeParse(now.getMinutes(), 60);

    /**
     * Solar Curve Logic (SDK 3 standard: 0 = cold, 1 = warm)
     * - Overnight (22:00 - 06:00): Ultra-warm (1.0)
     * - Morning (06:00 - 12:00): Transition from Warm (0.8) to Cool (0.1)
     * - Afternoon (12:00 - 18:00): Transition from Cool (0.1) to Warm (0.8)
     * - Evening (18:00 - 22:00): Transition to Ultra-warm (1.0)
     */
    let targetTemp = 0.5;

    if (hour >= 6 && hour < 12) {
      // Morning transition: Warm (0.8) -> Cool (0.1)
      // Linear interpolation: at hour 6 -> 0.8, at hour 12 -> 0.1
      const progress = safeDivide(hour - 6, 6);
      targetTemp = 0.8 - safeMultiply(progress, 0.7);
    } else if (hour >= 12 && hour < 18) {
      // Afternoon transition: Cool (0.1) -> Warm (0.8)
      // Linear interpolation: at hour 12 -> 0.1, at hour 18 -> 0.8
      const progress = safeDivide(hour - 12, 6);
      targetTemp = 0.1 + safeMultiply(progress, 0.7);
    } else if (hour >= 18 && hour < 22) {
      // Evening transition: Warm (0.8) -> Ultra-warm (1.0)
      // Linear interpolation: at hour 18 -> 0.8, at hour 22 -> 1.0
      const progress = safeDivide(hour - 18, 4);
      targetTemp = 0.8 + safeMultiply(progress, 0.2);
    } else {
      // Night (22:00 - 06:00)
      targetTemp = 1.0;
    }

    // Limit decimals for stability
    targetTemp = Math.round(targetTemp * 100) / 100;

    const currentTemp = this.getCapabilityValue('light_temperature');
    if (Math.abs(currentTemp - targetTemp) > 0.05) {
       this.log(`[NATURAL-LIGHT] Solar Sync: Hour ${hour.toFixed(1)} -> Target ${targetTemp}`);
       try {
         await this.setCapabilityValue('light_temperature', targetTemp);
       } catch (err) {
         this.error('[NATURAL-LIGHT] Failed to apply temperature:', err.message);
       }
    }
  },

  /**
   * Cleanup on device destroy
   */
  _destroyNaturalLight() {
    if (this._naturalLightTimer) {
      this.clearInterval(this._naturalLightTimer);
      this._naturalLightTimer = null;
    }
  }

};

module.exports = NaturalLightMixin;
