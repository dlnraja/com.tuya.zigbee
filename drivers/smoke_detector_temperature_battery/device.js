'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Smoke Detector with Temperature (Battery)
 * 
 * Category: Safety & Security
 * Priority: 5
 * 
 * Capabilities: alarm_smoke, alarm_fire, measure_temperature, alarm_battery, measure_battery
 */
class SmokeDetectorTemperatureBatteryDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('smoke_detector_temperature_battery initialized');
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

    // alarm_smoke capability
    if (this.hasCapability('alarm_smoke')) {
      try {
        this.registerCapability('alarm_smoke', CLUSTER.IAS_ZONE, {
          zoneType: 'smoke',
          get: 'zoneStatus',
          report: 'zoneStatus'
        });
        this.log('✅ alarm_smoke capability registered');
      } catch (err) {
        this.error('alarm_smoke capability failed:', err.message);
      }
    }

    // alarm_fire capability
    if (this.hasCapability('alarm_fire')) {
      try {
        this.registerCapability('alarm_fire', CLUSTER.IAS_ZONE, {
          zoneType: 'fire',
          get: 'zoneStatus',
          report: 'zoneStatus'
        });
        this.log('✅ alarm_fire capability registered');
      } catch (err) {
        this.error('alarm_fire capability failed:', err.message);
      }
    }

    // measure_temperature capability
    if (this.hasCapability('measure_temperature')) {
      try {
        this.registerCapability('measure_temperature', CLUSTER.TEMPERATURE_MEASUREMENT, {
          get: 'measuredValue',
          report: 'measuredValue',
          reportParser: value => value / 100
        });
        this.log('✅ measure_temperature capability registered');
      } catch (err) {
        this.error('measure_temperature capability failed:', err.message);
      }
    }

    // alarm_battery capability
    if (this.hasCapability('alarm_battery')) {
      try {
        this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryAlarmState',
          report: 'batteryAlarmState'
        });
        this.log('✅ alarm_battery capability registered');
      } catch (err) {
        this.error('alarm_battery capability failed:', err.message);
      }
    }

    // measure_battery capability
    if (this.hasCapability('measure_battery')) {
      try {
        this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
          get: 'batteryPercentageRemaining',
          report: 'batteryPercentageRemaining',
          reportParser: value => value / 2
        });
        this.log('✅ measure_battery capability registered');
      } catch (err) {
        this.error('measure_battery capability failed:', err.message);
      }
    }
  }

  /**
   * Handle device deletion
   */
  async onDeleted() {
    this.log('smoke_detector_temperature_battery deleted');
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

module.exports = SmokeDetectorTemperatureBatteryDevice;
