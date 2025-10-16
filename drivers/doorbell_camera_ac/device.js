'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Doorbell Camera Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Philips
 */
class DoorbellCameraAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('doorbell_camera_ac initialized');
    this.log('Device:', this.getData());

    await super.onNodeInit({ zclNode });

    // Register capabilities
    await this.registerCapabilities();

    await this.setAvailable();
  }

  async registerCapabilities() {
    // alarm_generic
    if (this.hasCapability('alarm_generic')) {
      try {
        this.registerCapability('alarm_generic', 1280, {
      zoneType: 'alarm',
      get: 'zoneStatus',
      report: 'zoneStatus'
    });
        this.log('✅ alarm_generic registered');
      } catch (err) {
        this.error('alarm_generic failed:', err);
      }
    }

    // alarm_motion
    if (this.hasCapability('alarm_motion')) {
      try {
        this.registerCapability('alarm_motion', 1030, {
      get: 'occupancy',
      report: 'occupancy',
      reportParser: value => (value & 1) === 1
    });
        this.log('✅ alarm_motion registered');
      } catch (err) {
        this.error('alarm_motion failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('doorbell_camera_ac deleted');
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

module.exports = DoorbellCameraAcDevice;
