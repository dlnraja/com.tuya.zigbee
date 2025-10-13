'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Smart Bulb Color RGB+CCT (AC)
 * 
 * Category: Smart Lighting
 * Priority: 1
 * 
 * Capabilities: onoff, dim, light_hue, light_saturation, light_temperature, light_mode
 */
class BulbColorRgbcctAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('bulb_color_rgbcct_ac initialized');
    this.log('Manufacturer:', this.getData().manufacturerName);
    this.log('Model:', this.getData().productId);

    // Call parent
    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    // Mark as available
    await this.setAvailable();
  }

  /**
   * Register all device capabilities
   */
  async registerCapabilities() {

    // onoff capability
    if (this.hasCapability('onoff')) {
      try {
        this.registerCapability('onoff', CLUSTER.ON_OFF, {
          get: 'onOff',
          report: 'onOff',
          set: 'toggle'
        });
        this.log('✅ onoff capability registered');
      } catch (err) {
        this.error('onoff capability failed:', err.message);
      }
    }

    // dim capability
    if (this.hasCapability('dim')) {
      try {
        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
          get: 'currentLevel',
          report: 'currentLevel',
          set: 'moveToLevelWithOnOff'
        });
        this.log('✅ dim capability registered');
      } catch (err) {
        this.error('dim capability failed:', err.message);
      }
    }

    // light_hue capability
    if (this.hasCapability('light_hue')) {
      try {
        this.registerCapability('light_hue', CLUSTER.COLOR_CONTROL, {
          get: 'currentHue',
          report: 'currentHue',
          set: 'moveToHue'
        });
        this.log('✅ light_hue capability registered');
      } catch (err) {
        this.error('light_hue capability failed:', err.message);
      }
    }

    // light_saturation capability
    if (this.hasCapability('light_saturation')) {
      try {
        this.registerCapability('light_saturation', CLUSTER.COLOR_CONTROL, {
          get: 'currentSaturation',
          report: 'currentSaturation',
          set: 'moveToSaturation'
        });
        this.log('✅ light_saturation capability registered');
      } catch (err) {
        this.error('light_saturation capability failed:', err.message);
      }
    }

    // light_temperature capability
    if (this.hasCapability('light_temperature')) {
      try {
        this.registerCapability('light_temperature', CLUSTER.COLOR_CONTROL, {
          get: 'colorTemperature',
          report: 'colorTemperature',
          set: 'moveToColorTemp'
        });
        this.log('✅ light_temperature capability registered');
      } catch (err) {
        this.error('light_temperature capability failed:', err.message);
      }
    }

    // light_mode capability
    if (this.hasCapability('light_mode')) {
      try {
        this.registerCapability('light_mode', CLUSTER.COLOR_CONTROL, {
          get: 'colorMode',
          report: 'colorMode'
        });
        this.log('✅ light_mode capability registered');
      } catch (err) {
        this.error('light_mode capability failed:', err.message);
      }
    }
  }

  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('bulb_color_rgbcct_ac deleted');
  }
  // ========================================
  // FLOW METHODS - Auto-generated
  // ========================================

  /**
   * Trigger flow with context data
   */
  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens);
      this.log(`✅ Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`❌ Flow trigger error: ${cardId}`, err);
    }
  }

  /**
   * Check if any alarm is active
   */
  async checkAnyAlarm() {
    const capabilities = this.getCapabilities();
    for (const cap of capabilities) {
      if (cap.startsWith('alarm_')) {
        const value = this.getCapabilityValue(cap);
        if (value === true) return true;
      }
    }
    return false;
  }

  /**
   * Get current context data
   */
  getContextData() {
    const context = {
      time_of_day: this.getTimeOfDay(),
      timestamp: new Date().toISOString()
    };
    
    // Add available sensor values
    const caps = this.getCapabilities();
    if (caps.includes('measure_luminance')) {
      context.luminance = this.getCapabilityValue('measure_luminance') || 0;
    }
    if (caps.includes('measure_temperature')) {
      context.temperature = this.getCapabilityValue('measure_temperature') || 0;
    }
    if (caps.includes('measure_humidity')) {
      context.humidity = this.getCapabilityValue('measure_humidity') || 0;
    }
    if (caps.includes('measure_battery')) {
      context.battery = this.getCapabilityValue('measure_battery') || 0;
    }
    
    return context;
  }

  /**
   * Get time of day
   */
  getTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }


}

module.exports = BulbColorRgbcctAcDevice;
