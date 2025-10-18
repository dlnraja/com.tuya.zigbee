'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const batteryConverter = require('../../lib/tuya-engine/converters/battery');
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
    // IAS Zone enrollment (motion/contact sensors)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact') || 
        this.hasCapability('alarm_water') || this.hasCapability('alarm_smoke')) {
      this.iasZoneEnroller = new IASZoneEnroller(this, zclNode);
      await this.iasZoneEnroller.enroll().catch(err => {
        this.error('IAS Zone enrollment failed:', err);
      });
    }

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
  
    this.log('bulb_color_rgbcct_ac initialized');
    this.log('Manufacturer:', this.getData().manufacturerName);
    this.log('Model:', this.getData().productId);

    // Call parent
    try {
    await super.onNodeInit({ zclNode });
    } catch (err) { this.error('Await error:', err); }

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
        this.registerCapability('onoff', 6, {
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
        this.registerCapability('dim', 8, {
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
        this.registerCapability('light_hue', 768, {
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
        this.registerCapability('light_saturation', 768, {
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
        this.registerCapability('light_temperature', 768, {
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
        this.registerCapability('light_mode', 768, {
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

}

module.exports = BulbColorRgbcctAcDevice;
