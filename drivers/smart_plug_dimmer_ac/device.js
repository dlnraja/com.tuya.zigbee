'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const { CLUSTER } = require('zigbee-clusters');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/FallbackSystem');

/**
 * Smart Plug with Dimmer (AC Powered)
 * 
 * UNBRANDED driver for smart plugs with dimming capability
 * Compatible with: Philips Hue, Signify, LEDVANCE and other brands
 * 
 * Features:
 * - On/Off control
 * - Dimming (0-100%)
 * - Power measurement (if supported)
 * - Energy metering (if supported)
 */
class SmartPlugDimmerAcDevice extends ZigBeeDevice {

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
      cluster: CLUSTER.POWER_CONFIGURATION,
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
  
    this.log('smart_plug_dimmer_ac initialized');
    this.log('Manufacturer:', this.getData().manufacturerName);
    this.log('Model:', this.getData().productId);

    // Call parent
    try {
    await super.onNodeInit({ zclNode });
    // Initialize Fallback System
    this.fallback = new FallbackSystem(this, {
      maxRetries: 3,
      baseDelay: 1000,
      verbosity: this.getSetting('debug_level') || 'INFO',
      trackPerformance: true
    });
    this.log('✅ FallbackSystem initialized');
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
    // On/Off capability
    if (this.hasCapability('onoff')) {
      try {
// TODO: Consider debouncing capability updates for better performance
        this.registerCapability('onoff', 6, {
          get: CLUSTER.ON_OFF,
          report: CLUSTER.ON_OFF,
          reportParser: value => {
            this.log('OnOff status:', value);
            return value;
          },
          set: 'toggle',
          setParser: value => {
            this.log('Setting onoff to:', value);
            return {};
          }
        });
        this.log('✅ OnOff capability registered');
      } catch (err) {
        this.error('OnOff capability failed:', err.message);
      }
    }

    // Dim capability
    if (this.hasCapability('dim')) {
      try {
        this.registerCapability('dim', 8, {
          get: 'currentLevel',
          report: 'currentLevel',
          reportParser: value => {
            const dim = value / 254;
            this.log('Dim level:', dim);
            return dim;
          },
          set: 'moveToLevelWithOnOff',
          setParser: value => {
            const level = Math.round(value * 254);
            this.log('Setting dim to:', value, '(level:', level, ')');
            return {
              level,
              transitionTime: 10 // 1 second (10 * 100ms)
            };
          }
        });
        this.log('✅ Dim capability registered');
      } catch (err) {
        this.error('Dim capability failed:', err.message);
      }
    }

    // Power measurement (if device supports it)
    if (this.hasCapability('measure_power')) {
      try {
        // Try to register, but don't fail if cluster not available
        this.registerCapability('measure_power', 2820, {
          get: 'activePower',
          report: 'activePower',
          reportParser: value => {
            // Value is in watts (signed 16-bit)
            const power = value < 0 ? 0 : value;
            this.log('Power measurement:', power, 'W');
            return power;
          }
        });
        this.log('✅ Power measurement capability registered');
      } catch (err) {
        this.log('ℹ️  Power measurement not available:', err.message);
        // Remove capability if not supported
        if (this.hasCapability('measure_power')) {
          try {
          await this.removeCapability('measure_power').catch(() => {});
          } catch (err) { this.error('Await error:', err); }
        }
      }
    }

    // Energy metering (if device supports it)
    if (this.hasCapability('meter_power')) {
      try {
        this.registerCapability('meter_power', 1794, {
          get: 'currentSummationDelivered',
          report: 'currentSummationDelivered',
          reportParser: value => {
            // Value is typically in Wh or kWh depending on device
            const energy = value / 1000; // Convert to kWh
            this.log('Energy meter:', energy, 'kWh');
            return energy;
          }
        });
        this.log('✅ Energy meter capability registered');
      } catch (err) {
        this.log('ℹ️  Energy metering not available:', err.message);
        // Remove capability if not supported
        if (this.hasCapability('meter_power')) {
          try {
          await this.removeCapability('meter_power').catch(() => {});
          } catch (err) { this.error('Await error:', err); }
        }
      }
    }
  }

  /**
   * Handle device settings changes
   */
  async onSettings({ oldSettings, newSettings, changedKeys }) {
    this.log('Settings changed:', changedKeys);

    for (const key of changedKeys) {
      const newValue = newSettings[key];
      this.log(`Setting ${key} changed to:`, newValue);

      try {
        switch (key) {
          case 'transition_time':
            // Transition time for dimming (in 100ms steps)
            this.transitionTime = newValue * 10;
            this.log('Updated transition time:', this.transitionTime);
            break;

          case 'power_on_behavior':
            // Power on behavior (restore previous state, on, off)
            await this.configurePowerOnBehavior(newValue);
            break;

          default:
            this.log('Unknown setting:', key);
        }
      } catch (err) {
        this.error(`Failed to update setting ${key}:`, err);
        throw new Error(`Failed to update ${key}: ${err.message}`);
      }
    }
  }

  /**
   * Configure power-on behavior
   */
  async configurePowerOnBehavior(behavior) {
    try {
      const { zclNode } = this;
      const endpoint = zclNode.endpoints[this.getClusterEndpoint(6)];

      if (endpoint && endpoint.clusters.onOff) {
        let startUpOnOff;
        
        switch (behavior) {
          case 'on':
            startUpOnOff = 1; // Turn on
            break;
          case 'off':
            startUpOnOff = 0; // Turn off
            break;
          case 'previous':
          default:
            startUpOnOff = 255; // Restore previous state
            break;
        }

        try {
        await endpoint.clusters.onOff.writeAttributes({
        } catch (err) { this.error('Await error:', err); }
          startUpOnOff
        });

        this.log('✅ Power-on behavior configured:', behavior);
      }
    } catch (err) {
      this.error('Failed to configure power-on behavior:', err.message);
    }
  }

  async onDeleted() {
    this.log('smart_plug_dimmer_ac deleted');
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

module.exports = SmartPlugDimmerAcDevice;
