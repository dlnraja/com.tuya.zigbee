'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');

class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    this.log('sos_emergency_button_cr2032 initialized');

    // Battery (cluster 1)
    this.registerCapability('measure_battery', 1, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true
      },
      reportParser: value => {
        this.log('Battery raw value:', value);
        return value / 2;
      }
    });
    this.log('✅ Battery capability registered');
    
    // SOS Button IAS Zone
    this.log('🚨 Setting up SOS button IAS Zone...');
    try {
      const endpoint = zclNode.endpoints[1];
      const enroller = new IASZoneEnroller(this, endpoint, {
        zoneType: 21, // Emergency button
        capability: 'alarm_generic',
        pollInterval: 30000,
        autoResetTimeout: 0 // No auto-reset for SOS
      });
      const method = await enroller.enroll(zclNode);
      this.log(`✅ SOS IAS Zone enrolled via: ${method}`);
      
      // Add robust listener for alarm_generic
      this.registerCapabilityListener('alarm_generic', async (value) => {
        this.log('🚨 SOS Button pressed! Alarm:', value);
        
        // Trigger flow card
        const triggerId = value ? 'sos_button_pressed' : 'sos_button_released';
        try {
          await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this);
          this.log(`✅ Flow triggered: ${triggerId}`);
        } catch (error) {
          this.error('Flow trigger error:', error.message);
        }
      });
      
      // Direct IAS Zone status notification handler
      if (endpoint.clusters.iasZone) {
        endpoint.clusters.iasZone.onZoneStatusChangeNotification = (payload) => {
          this.log('🚨 IAS Zone Status Notification:', payload);
          
          const alarm = (payload.zoneStatus & 0x01) !== 0;
          this.setCapabilityValue('alarm_generic', alarm).catch(this.error);
        };
      }
      
    } catch (err) {
      this.error('IAS Zone enrollment failed:', err);
      this.log('⚠️ Device may auto-enroll or work without explicit enrollment');
    }

    await this.setAvailable();
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

module.exports = SOSEmergencyButtonDevice;
