'use strict';

/**
 * SmartBiorhythmHandler (Dynamic Sunlight Emulation)
 * Emulates the "Natural Light" / Circadian Rhythm feature found in Philips Hue.
 * Dynamically shifts the color temperature of lights based on the time of day.
 */
class SmartBiorhythmHandler {
  constructor(device) {
    this.device = device;
    this._interval = null;
    this.isActive = false;
    
    // Tuya specific DPs for biorhythm (often DP 30 or 34, but we simulate it locally if unsupported)
    this.DP_BIORHYTHM_TOGGLE = 30;
  }

  log(...args) {
    if (this.device && typeof this.device.log === 'function') {
      this.device.log('[BIORHYTHM]', ...args);
    }
  }

  async init() {
    // Check if the device has light_temperature capability
    if (!this.device.hasCapability('light_temperature')) return;

    // Check saved state
    this.isActive = this.device.getStoreValue('biorhythm_active') === true;

    if (this.isActive) {
      this.start();
    }
  }

  async handleDP(dpId, value) {
    if (dpId === this.DP_BIORHYTHM_TOGGLE) {
      const active = Boolean(value);
      if (active !== this.isActive) {
        this.isActive = active;
        this.device.setStoreValue('biorhythm_active', active).catch(() => {});
        this.log(`Toggled ${active ? 'ON' : 'OFF'} via Tuya DP`);
        if (active) this.start();
        else this.stop();
        return true;
      }
    }
    return false;
  }

  /**
   * Calculate circadian color temperature based on current time.
   * Sunrise (~6AM): Warm (0.8)
   * Noon (~12PM): Cold (0.1)
   * Sunset (~6PM): Warm (0.8)
   * Night (~10PM): Very Warm (1.0)
   * (Homey light_temperature: 0.0 is cold/blue, 1.0 is warm/yellow)
   */
  _calculateCurrentTemperature() {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) {
      // 6AM to 12PM: Warm (0.8) to Cold (0.1)
      const progress = (hour - 6) / 6;
      return 0.8 - (progress * 0.7);
    } else if (hour >= 12 && hour < 18) {
      // 12PM to 6PM: Cold (0.1) to Warm (0.8)
      const progress = (hour - 12) / 6;
      return 0.1 + (progress * 0.7);
    } else if (hour >= 18 && hour < 22) {
      // 6PM to 10PM: Warm (0.8) to Very Warm (1.0)
      const progress = (hour - 18) / 4;
      return 0.8 + (progress * 0.2);
    } else {
      // 10PM to 6AM: Very Warm (1.0)
      return 1.0;
    }
  }

  start() {
    if (this._interval) clearInterval(this._interval);
    this.isActive = true;
    
    // Update immediately
    this._applyTemperature();

    // Update every 15 minutes
    this._interval = setInterval(() => {
      this._applyTemperature();
    }, 15 * 60 * 1000);
    
    this.log('🌅 Dynamic Sunlight (Circadian Rhythm) Activated');
  }

  stop() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
    this.isActive = false;
    this.log('🛑 Dynamic Sunlight Deactivated');
  }

  async _applyTemperature() {
    if (this.device._destroyed) {
      this.stop();
      return;
    }

    try {
      // If the light is off, don't wake it up unnecessarily unless it's a Tuya DP push
      const isOff = this.device.getCapabilityValue('onoff') === false;
      if (isOff) return;

      const targetTemp = this._calculateCurrentTemperature();
      const currentTemp = this.device.getCapabilityValue('light_temperature');

      // Only push if there's a significant change (> 0.05) to save Zigbee bandwidth
      if (currentTemp === null || Math.abs(currentTemp - targetTemp) > 0.05) {
        await this.device.safeSetCapabilityValue('light_temperature', Number(targetTemp.toFixed(2)));
        this.log(`☀️ Shifted light_temperature to ${targetTemp.toFixed(2)} based on solar time`);
      }
    } catch (err) {
      // Silent catch
    }
  }
}

module.exports = SmartBiorhythmHandler;
