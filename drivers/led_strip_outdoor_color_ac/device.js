'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Led Strip Outdoor Color Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Philips
 */
class LedStripOutdoorColorAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('led_strip_outdoor_color_ac initialized');
    this.log('Device:', this.getData());

    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    await this.setAvailable();
  }

  async registerCapabilities() {
    // onoff
    if (this.hasCapability('onoff')) {
      try {
        this.registerCapability('onoff', CLUSTER.ON_OFF, {
      get: 'onOff',
      report: 'onOff',
      set: 'toggle',
      setParser: value => ({ })
    });
        this.log('✅ onoff registered');
      } catch (err) {
        this.error('onoff failed:', err);
      }
    }

    // dim
    if (this.hasCapability('dim')) {
      try {
        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
      get: 'currentLevel',
      report: 'currentLevel',
      set: 'moveToLevelWithOnOff',
      setParser: value => ({ level: value * 255, transitionTime: 0 })
    });
        this.log('✅ dim registered');
      } catch (err) {
        this.error('dim failed:', err);
      }
    }

    // light_hue
    if (this.hasCapability('light_hue')) {
      try {
        this.registerCapability('light_hue', CLUSTER.COLOR_CONTROL, {
      get: 'currentHue',
      report: 'currentHue',
      set: 'moveToHue',
      setParser: value => ({ hue: value * 254, direction: 0, transitionTime: 0 })
    });
        this.log('✅ light_hue registered');
      } catch (err) {
        this.error('light_hue failed:', err);
      }
    }

    // light_saturation
    if (this.hasCapability('light_saturation')) {
      try {
        this.registerCapability('light_saturation', CLUSTER.COLOR_CONTROL, {
      get: 'currentSaturation',
      report: 'currentSaturation',
      set: 'moveToSaturation',
      setParser: value => ({ saturation: value * 254, transitionTime: 0 })
    });
        this.log('✅ light_saturation registered');
      } catch (err) {
        this.error('light_saturation failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('led_strip_outdoor_color_ac deleted');
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

module.exports = LedStripOutdoorColorAcDevice;
