'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/FallbackSystem');

class SOSEmergencyButtonDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // Configure battery reporting (min 1h, max 24h, delta 5%)
    try {
    await this.configureAttributeReporting([{
    } catch (err) { this.error('Await error:', err); }
      endpointId: 1,
      cluster: 'powerConfiguration',
      attributeName: 'batteryPercentageRemaining',
      minInterval: 3600,
      maxInterval: 86400,
      minChange: 10 // 5% (0-200 scale)
    }]).catch(err => this.log('Battery report config failed (ignorable):', err.message));

    // Force initial read après pairing (résout données non visibles)
    setTimeout(() => {
      this.pollAttributes().catch(err => this.error('Initial poll failed:', err));
    }, 5000);

    // Poll attributes régulièrement pour assurer visibilité données
    this.registerPollInterval(async () => {
      try {
        // Force read de tous les attributes critiques
        await this.pollAttributes();
      } catch (err) {
        this.error('Poll failed:', err);
      }
    }, 300000); // 5 minutes
  
    this.log('sos_emergency_button_cr2032 initialized');

    // Battery (cluster 1) - Using standard converter
    this.registerCapability('measure_battery', 1, {
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      getOpts: {
        getOnStart: true
      },
      reportParser: value => {
        this.log('Battery raw value:', value);
        return fromZclBatteryPercentageRemaining(value);
      },
      getParser: value => fromZclBatteryPercentageRemaining(value)
    });
    this.log('✅ Battery capability registered with converter');
    
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

    try {
    await this.setAvailable();
    } catch (err) { this.error('Await error:', err); }
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



  /**
   * Poll tous les attributes pour forcer mise à jour
   * Résout: Données non visibles après pairing (Peter + autres)
   */
  async pollAttributes() {
    const promises = [];
    
    // Battery
    if (this.hasCapability('measure_battery')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.powerConfiguration?.readAttributes('batteryPercentageRemaining')
          .catch(err => this.log('Battery read failed (ignorable):', err.message))
      );
    }
    
    // Temperature
    if (this.hasCapability('measure_temperature')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.temperatureMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Temperature read failed (ignorable):', err.message))
      );
    }
    
    // Humidity
    if (this.hasCapability('measure_humidity')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.relativeHumidity?.readAttributes('measuredValue')
          .catch(err => this.log('Humidity read failed (ignorable):', err.message))
      );
    }
    
    // Illuminance
    if (this.hasCapability('measure_luminance')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.illuminanceMeasurement?.readAttributes('measuredValue')
          .catch(err => this.log('Illuminance read failed (ignorable):', err.message))
      );
    }
    
    // Alarm status (IAS Zone)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact')) {
      promises.push(
        this.zclNode.endpoints[1]?.clusters.iasZone?.readAttributes('zoneStatus')
          .catch(err => this.log('IAS Zone read failed (ignorable):', err.message))
      );
    }
    
    try {
    await Promise.allSettled(promises);
    } catch (err) { this.error('Await error:', err); }
    this.log('✅ Poll attributes completed');
  }



  /**
   * Read attribute with intelligent fallback
   * Tries multiple strategies until success
   */
  async readAttributeSafe(cluster, attribute) {
    try {
      return await this.fallback.readAttributeWithFallback(cluster, attribute);
    } catch (err) {
      this.error(`Failed to read ${cluster}.${attribute} after all fallback strategies:`, err);
      throw err;
    }
  }

  /**
   * Configure report with intelligent fallback
   */
  async configureReportSafe(config) {
    try {
      return await this.fallback.configureReportWithFallback(config);
    } catch (err) {
      this.error(`Failed to configure report after all fallback strategies:`, err);
      // Don't throw - use polling as ultimate fallback
      return { success: false, method: 'polling' };
    }
  }

  /**
   * IAS Zone enrollment with fallback
   */
  async enrollIASZoneSafe() {
    try {
      return await this.fallback.iasEnrollWithFallback();
    } catch (err) {
      this.error('Failed to enroll IAS Zone after all fallback strategies:', err);
      throw err;
    }
  }

  /**
   * Get fallback system statistics
   */
  getFallbackStats() {
    return this.fallback ? this.fallback.getStats() : null;
  }
}

module.exports = SOSEmergencyButtonDevice;
