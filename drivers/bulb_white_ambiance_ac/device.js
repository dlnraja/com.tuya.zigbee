'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Bulb White Ambiance Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Philips
 */
class BulbWhiteAmbianceAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('bulb_white_ambiance_ac initialized');
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
        this.registerCapability('onoff', 6, {
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
        this.registerCapability('dim', 8, {
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

    // light_temperature
    if (this.hasCapability('light_temperature')) {
      try {
        this.registerCapability('light_temperature', 768, {
      get: 'colorTemperature',
      report: 'colorTemperature',
      set: 'moveToColorTemp',
      setParser: value => ({ colorTemperature: Math.round(1e6 / value), transitionTime: 0 })
    });
        this.log('✅ light_temperature registered');
      } catch (err) {
        this.error('light_temperature failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('bulb_white_ambiance_ac deleted');
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

module.exports = BulbWhiteAmbianceAcDevice;
