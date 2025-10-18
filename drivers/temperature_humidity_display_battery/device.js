'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const batteryConverter = require('../../lib/tuya-engine/converters/battery');
const { CLUSTER } = require('zigbee-clusters');
const FallbackSystem = require('../../lib/FallbackSystem');

 catch (err) {
      this.error('Battery change detection error:', err);
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

module.exports = TemperatureHumidityDisplayBatteryDevice;
