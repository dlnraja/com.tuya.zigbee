'use strict';
const { safeDivide, safeMultiply, safeParse } = require('../utils/tuyaUtils.js');

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
    this.converter = require('../helpers/ColorConverter');
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
    if (!this.active) return;
    // v7.2.5: COMPENSATE - Even if it lacks light_color_temp natively, we can use RGB or Dim fallback
    const hasCT = this.device.hasCapability('light_color_temp');
    const hasRGB = this.device.hasCapability('light_hue') && this.device.hasCapability('light_saturation');
    const hasDim = this.device.hasCapability('dim');

    if (!hasCT && !hasRGB && !hasDim) return;
    
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
        tempPercentage = 1 - safeDivide(hour - 6, 6);
    } else if (hour >= 12 && hour < 18) { // Afternoon: Cold -> Warm
        tempPercentage = safeDivide(hour - 12, 6);
    } else { // Night: Warmest
        tempPercentage = 1;
    }

    // Map to Kelvin (2000K to 6500K)
    const kelvin = 6500 - safeMultiply(tempPercentage, 4500);
    
    // Homey uses 0 (cold) to 1 (warm)
    const homeyValue = tempPercentage;

    // 1. NATIVE COMPENSATION (If hardware supports CT)
    if (this.device.hasCapability('light_color_temp')) {
      const currentVal = this.device.getCapabilityValue('light_color_temp') || 0;
      if (Math.abs(homeyValue - currentVal) > 0.05) {
        this.device.log(` [ADAPTIVE] Native CT Adjust: ${Math.round(kelvin)}K`);
        await this.device.setCapabilityValue('light_color_temp', homeyValue).catch(() => {});
      }
    } 
    // 2. ALGORITHMIC COMPENSATION (If RGB only)
    else if (this.device.hasCapability('light_hue') && this.device.hasCapability('light_saturation')) {
       const mireds = Math.round(safeDivide(1000000, kelvin));
       const rgb = this.converter.miredToRgb(mireds);
       const hsv = this.converter.rgbToHsv(rgb.r, rgb.g, rgb.b);
       
       this.device.log(` [ADAPTIVE] RGB COMPENSATION: ${Math.round(kelvin)}K -> H:${Math.round(hsv.h*360)} S:${Math.round(hsv.s)}%`);
       await this.device.setCapabilityValue('light_hue', hsv.h).catch(() => {});
       await this.device.setCapabilityValue('light_saturation', hsv.s).catch(() => {});
    }

    // 3. BRIGHTNESS COMPENSATION (Circadian Rhythm)
    // Night (00:00-06:00): 10-30%
    // Day (10:00-16:00): 80-100%
    if (this.device.hasCapability('dim')) {
       let brightness = 1.0;
       if (hour < 6 || hour >= 22) {
         brightness = 0.2; // Dim at night
       } else if (hour >= 6 && hour < 10) {
         brightness = 0.2 + safeMultiply(safeDivide(hour - 6, 4), 0.8); // Wake up
       } else if (hour >= 18 && hour < 22) {
         brightness = 1.0 - safeMultiply(safeDivide(hour - 18, 4), 0.8); // Wind down
       }
       
       const currentDim = this.device.getCapabilityValue('dim') || 0;
       if (Math.abs(brightness - currentDim) > 0.1) {
          await this.device.setCapabilityValue('dim', brightness).catch(() => {});
       }
    }
  }
}

module.exports = AdaptiveLightingManager;
