'use strict';

/**
 * AdaptiveLightingManager - v1.0.0
 * Implementation of "Natural Light" / Adaptive Lighting for ALL Zigbee bulbs.
 * Computes Color Temperature and Brightness based on sun position.
 */

class AdaptiveLightingManager {
  constructor(device) {
    this.device = device;
    this.active = false;
    this._timer = null;
    this._lastUpdate = 0;
  }

  async init() {
    this.active = this.device.getSetting('adaptive_lighting_enabled') || false;
    if (this.active) this.start();
  }

  start() {
    this.active = true;
    if (this._timer) clearInterval(this._timer);
    this._timer = setInterval(() => this.update(), 120000); // Every 2 minutes
    this.update();
  }

  stop() {
    this.active = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }

  async update() {
    if (!this.active || !this.device.hasCapability('light_color_temp')) return;
    
    // v7.0.52: Staggered Transition (Prevent Zigbee congestion)
    const staggerDelay = Math.floor(Math.random() * 30000); // 0-30s delay
    setTimeout(async () => {
      await this._executeUpdate();
    }, staggerDelay);
  }

  async _executeUpdate() {
    if (!this.active) return;
    // Check if light is ON
    if (this.device.hasCapability('onoff') && !this.device.getCapabilityValue('onoff')) return;

    const now = new Date();
    const hour = now.getHours();
    
    // Simple Solar Curve Calculation
    // Midday (12:00) = 4500K-6000K (Cool)
    // Night (00:00) = 2000K-2700K (Warm)
    let tempPercentage = 0; // 0 = Coldest, 1 = Warmest
    
    if (hour >= 6 && hour < 12) { // Morning: Warm -> Cold
        tempPercentage = 1 - ((hour - 6) / 6);
    } else if (hour >= 12 && hour < 18) { // Afternoon: Cold -> Warm
        tempPercentage = (hour - 12) / 6;
    } else { // Night: Warmest
        tempPercentage = 1;
    }

    // Map to Kelvin (2000K to 6500K)
    const kelvin = 6500 - (tempPercentage * (6500 - 2000));
    
    // Homey uses 0 (cold) to 1 (warm)
    const homeyValue = tempPercentage;

    if (Math.abs(homeyValue - (this.device.getCapabilityValue('light_color_temp') || 0)) > 0.05) {
      this.device.log(`🌓 [ADAPTIVE] Adjusting Color Temp to ${Math.round(kelvin)}K (${Math.round(homeyValue * 100)}% warm)`);
      await this.device.setCapabilityValue('light_color_temp', homeyValue).catch(() => {});
    }
  }
}

module.exports = AdaptiveLightingManager;
