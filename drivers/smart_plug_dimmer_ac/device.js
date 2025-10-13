'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

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
    this.log('smart_plug_dimmer_ac initialized');
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
    // On/Off capability
    if (this.hasCapability('onoff')) {
      try {
        this.registerCapability('onoff', CLUSTER.ON_OFF, {
          get: 'onOff',
          report: 'onOff',
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
        this.registerCapability('dim', CLUSTER.LEVEL_CONTROL, {
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
        this.registerCapability('measure_power', CLUSTER.ELECTRICAL_MEASUREMENT, {
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
          await this.removeCapability('measure_power').catch(() => {});
        }
      }
    }

    // Energy metering (if device supports it)
    if (this.hasCapability('meter_power')) {
      try {
        this.registerCapability('meter_power', CLUSTER.METERING, {
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
          await this.removeCapability('meter_power').catch(() => {});
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
      const endpoint = zclNode.endpoints[this.getClusterEndpoint(CLUSTER.ON_OFF)];

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

        await endpoint.clusters.onOff.writeAttributes({
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


}

module.exports = SmartPlugDimmerAcDevice;
