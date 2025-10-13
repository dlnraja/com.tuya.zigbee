'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

/**
 * Smart Plug Power Meter 16a Ac
 * 
 * UNBRANDED Architecture
 * Generated: 2025-10-12
 * Supports: Tuya
 */
class SmartPlugPowerMeter16aAcDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('smart_plug_power_meter_16a_ac initialized');
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

    // measure_power
    if (this.hasCapability('measure_power')) {
      try {
        this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'activePower',
      report: 'activePower',
      reportParser: value => value / 10
    });
        this.log('✅ measure_power registered');
      } catch (err) {
        this.error('measure_power failed:', err);
      }
    }

    // measure_voltage
    if (this.hasCapability('measure_voltage')) {
      try {
        this.registerCapability('measure_voltage', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsVoltage',
      report: 'rmsVoltage',
      reportParser: value => value / 10
    });
        this.log('✅ measure_voltage registered');
      } catch (err) {
        this.error('measure_voltage failed:', err);
      }
    }

    // measure_current
    if (this.hasCapability('measure_current')) {
      try {
        this.registerCapability('measure_current', CLUSTER.ELECTRICAL_MEASUREMENT, {
      get: 'rmsCurrent',
      report: 'rmsCurrent',
      reportParser: value => value / 1000
    });
        this.log('✅ measure_current registered');
      } catch (err) {
        this.error('measure_current failed:', err);
      }
    }

    // meter_power
    if (this.hasCapability('meter_power')) {
      try {
        this.registerCapability('meter_power', CLUSTER.METERING, {
      get: 'currentSummDelivered',
      report: 'currentSummDelivered',
      reportParser: value => value / 1000
    });
        this.log('✅ meter_power registered');
      } catch (err) {
        this.error('meter_power failed:', err);
      }
    }
  }

  async onDeleted() {
    this.log('smart_plug_power_meter_16a_ac deleted');
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

module.exports = SmartPlugPowerMeter16aAcDevice;
