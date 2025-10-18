'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class MotionSensorDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('Motion sensor initialized');

    // IAS Zone Enrollment (CRITICAL for motion detection)
    if (this.hasCapability('alarm_motion')) {
      try {
        this.iasZoneEnroller = new IASZoneEnroller(this, this.zclNode.endpoints[1], {
          capability: 'alarm_motion',
          zoneType: 13, // Motion sensor
          autoResetTimeout: 30000 // 30 seconds
        });
        
        const enrollResult = await this.iasZoneEnroller.enroll(zclNode);
        this.log('IAS Zone enrollment:', enrollResult);
      } catch (err) {
        this.error('IAS Zone enrollment failed:', err);
      }
    }

    // Register battery capability
    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', 1, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => fromZclBatteryPercentageRemaining(value),
        getOpts: {
          getOnStart: true,
        },
      });
    }

    // Mark device as available
    await this.setAvailable();
  }

  async onDeleted() {
    this.log('Motion sensor deleted');
    
    if (this.iasZoneEnroller) {
      this.iasZoneEnroller.destroy();
    }
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

module.exports = MotionSensorDevice;
