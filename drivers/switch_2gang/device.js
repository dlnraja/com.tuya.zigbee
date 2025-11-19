'use strict';

const SwitchDevice = require('../../lib/devices/SwitchDevice');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const batteryConverter = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/FallbackSystem');

class SmartSwitch2gangHybridDevice extends SwitchDevice {

  async onNodeInit({ zclNode }) {
    // Initialize hybrid base (power detection)
    await super.onNodeInit({ zclNode });

    this.log('smart_switch_2gang_hybrid device initialized');

    // Register capabilities
    // Register on/off capability
    // TODO: Consider debouncing capability updates for better performance
    this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

    // Mark device as available
    try {
      await this.setAvailable().catch(err => this.error(err));
    } catch (err) { this.error('Await error:', err); }
  }

  async onCapabilityOnoff(value, opts) {
    this.log('onCapabilityOnoff:', value);

    try {
      if (value) {
        await this.zclNode.endpoints[1].clusters.onOff.setOn().catch(err => this.error(err));
      } else {
        await this.zclNode.endpoints[1].clusters.onOff.setOff().catch(err => this.error(err));
      }

      return Promise.resolve();
    } catch (error) {
      this.error('Error setting onoff:', error);
      return Promise.reject(error);
    }
  }

  async onDeleted() {
    this.log('smart_switch_2gang_hybrid device deleted');
  }


  async setCapabilityValue(capabilityId, value) {
    try {
      await super.setCapabilityValue(capabilityId, value).catch(err => this.error(err));
    } catch (err) { this.error('Await error:', err); }
    await this.triggerCapabilityFlow(capabilityId, value).catch(err => this.error(err));
  }


  // ============================================================================
  // FLOW CARD HANDLERS
  // ============================================================================

  async registerFlowCardHandlers() {
    this.log('Registering flow card handlers...');

    // TRIGGERS
    // Triggers are handled automatically via triggerCapabilityFlow()

    // CONDITIONS

    // Condition: OnOff
    try {
      const isOnCard = this.homey.flow.getDeviceConditionCard('smart_switch_2gang_hybrid_is_on');
      if (isOnCard) {
        isOnCard.registerRunListener(async (args, state) => {
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (error) {
      // Card might not exist for this driver
    }

    // Condition: Alarm states
    const alarmCaps = this.getCapabilities().filter(c => c.startsWith('alarm_'));
    alarmCaps.forEach(alarmCap => {
      try {
        const conditionCard = this.homey.flow.getDeviceConditionCard(`smart_switch_2gang_hybrid_${alarmCap}_is_active`);
        if (conditionCard) {
          conditionCard.registerRunListener(async (args, state) => {
            return args.device.getCapabilityValue(alarmCap) === true;
          });
        }
      } catch (error) {
        // Card might not exist
      }
    });

    // Condition: Measure comparisons
    const measureCaps = this.getCapabilities().filter(c => c.startsWith('measure_'));
    measureCaps.forEach(measureCap => {
      try {
        // Greater than
        const gtCard = this.homey.flow.getDeviceConditionCard(`smart_switch_2gang_hybrid_${measureCap}_greater_than`);
        if (gtCard) {
          gtCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.greater === '>') return value > args.value;
            if (args.greater === '>=') return value >= args.value;
            return false;
          });
        }

        // Less than
        const ltCard = this.homey.flow.getDeviceConditionCard(`smart_switch_2gang_hybrid_${measureCap}_less_than`);
        if (ltCard) {
          ltCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.less === '<') return value < args.value;
            if (args.less === '<=') return value <= args.value;
            return false;
          });
        }
      } catch (error) {
        // Card might not exist
      }
    });


    // ACTIONS

    // Action: Turn On
    try {
      const turnOnCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_turn_on');
      if (turnOnCard) {
        turnOnCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('onoff', true).catch(err => this.error(err));
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Turn Off
    try {
      const turnOffCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_turn_off');
      if (turnOffCard) {
        turnOffCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('onoff', false).catch(err => this.error(err));
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Toggle
    try {
      const toggleCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_toggle');
      if (toggleCard) {
        toggleCard.registerRunListener(async (args, state) => {
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current).catch(err => this.error(err));
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Set Dim
    try {
      const setDimCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_set_dim');
      if (setDimCard) {
        setDimCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('dim', args.dim).catch(err => this.error(err));
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Set Temperature
    try {
      const setTempCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_set_temperature');
      if (setTempCard) {
        setTempCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('target_temperature', args.temperature).catch(err => this.error(err));
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Window Coverings
    try {
      const openCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_open');
      if (openCard) {
        openCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 1).catch(err => this.error(err));
        });
      }

      const closeCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_close');
      if (closeCard) {
        closeCard.registerRunListener(async (args, state) => {
          try {
            await args.device.setCapabilityValue('windowcoverings_set', 0).catch(err => this.error(err));
          } catch (err) { this.error('Await error:', err); }
        });
      }

      const setPosCard = this.homey.flow.getDeviceActionCard('smart_switch_2gang_hybrid_set_position');
      if (setPosCard) {
        setPosCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', args.position).catch(err => this.error(err));
        });
      }
    } catch (error) {
      // Cards might not exist
    }

    // Action: Maintenance - Identify
    try {
      const identifyCard = this.homey.flow.getDeviceActionCard('identify_device');
      if (identifyCard) {
        identifyCard.registerRunListener(async (args, state) => {
          // Flash the device (if it has onoff)
          if (args.device.hasCapability('onoff')) {
            const original = args.device.getCapabilityValue('onoff');
            for (let i = 0; i < 3; i++) {
              await args.device.setCapabilityValue('onoff', true).catch(err => this.error(err));
              await new Promise(resolve => setTimeout(resolve, 300)).catch(err => this.error(err));
              await args.device.setCapabilityValue('onoff', false).catch(err => this.error(err));
              try {
                await new Promise(resolve => setTimeout(resolve, 300)).catch(err => this.error(err));
              } catch (err) { this.error('Await error:', err); }
            }
            await args.device.setCapabilityValue('onoff', original).catch(err => this.error(err));
          }
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Reset Meter
    try {
      const resetMeterCard = this.homey.flow.getDeviceActionCard('reset_meter');
      if (resetMeterCard) {
        resetMeterCard.registerRunListener(async (args, state) => {
          if (args.device.hasCapability('meter_power')) {
            await args.device.setCapabilityValue('meter_power', 0).catch(err => this.error(err));
            this.log('Power meter reset');
          }
        });
      }
    } catch (error) {
      // Card might not exist
    }

  }

  // Helper: Trigger flow when capability changes
  async triggerCapabilityFlow(capabilityId, value) {
    const driverId = this.driver.id;

    // Alarm triggers
    if (capabilityId.startsWith('alarm_')) {
      const alarmName = capabilityId;
      const triggerIdTrue = `${driverId}_${alarmName}_true`;
      const triggerIdFalse = `${driverId}_${alarmName}_false`;

      try {
        if (value === true) {
          await this.homey.flow.getDeviceTriggerCard(triggerIdTrue).trigger(this).catch(err => this.error(err));
          this.log(`Triggered: ${triggerIdTrue}`);
        } else if (value === false) {
          await this.homey.flow.getDeviceTriggerCard(triggerIdFalse).trigger(this).catch(err => this.error(err));
          this.log(`Triggered: ${triggerIdFalse}`);
        }
      } catch (error) {
        this.error(`Error triggering ${alarmName}:`, error.message);
      }
    }

    // Measure triggers
    if (capabilityId.startsWith('measure_')) {
      const triggerId = `${driverId}_${capabilityId}_changed`;
      try {
        await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this, { value }).catch(err => this.error(err));
        this.log(`Triggered: ${triggerId} with value: ${value}`);
      } catch (error) {
        this.error(`Error triggering ${capabilityId}:`, error.message);
      }
    }

    // OnOff triggers
    if (capabilityId === 'onoff') {
      const triggerId = value ? `${driverId}_turned_on` : `${driverId}_turned_off`;
      try {
        await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this).catch(err => this.error(err));
        this.log(`Triggered: ${triggerId}`);
      } catch (error) {
        this.error(`Error triggering onoff:`, error.message);
      }
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
      await flowCard.trigger(this, tokens).catch(err => this.error(err));
      this.log(`[OK] Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`[ERROR] Flow trigger error: ${cardId}`, err);
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
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.powerConfiguration?.readAttributes(['batteryPercentageRemaining'])
          .catch(err => this.log('Battery read failed (ignorable):', err.message))
      );
    }

    // Temperature
    if (this.hasCapability('measure_temperature')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.temperatureMeasurement?.readAttributes(['measuredValue'])
          .catch(err => this.log('Temperature read failed (ignorable):', err.message))
      );
    }

    // Humidity
    if (this.hasCapability('measure_humidity')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.relativeHumidity?.readAttributes(['measuredValue'])
          .catch(err => this.log('Humidity read failed (ignorable):', err.message))
      );
    }

    // Illuminance
    if (this.hasCapability('measure_luminance')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.illuminanceMeasurement?.readAttributes(['measuredValue'])
          .catch(err => this.log('Illuminance read failed (ignorable):', err.message))
      );
    }

    // Alarm status (IAS Zone)
    if (this.hasCapability('alarm_motion') || this.hasCapability('alarm_contact')) {
      promises.push(
        // TODO: Wrap in try/catch
        this.zclNode.endpoints[1]?.clusters.iasZone?.readAttributes(['zoneStatus'])
          .catch(err => this.log('IAS Zone read failed (ignorable):', err.message))
      );
    }

    try {
      await Promise.allSettled(promises).catch(err => this.error(err));
    } catch (err) { this.error('Await error:', err); }
    this.log('[OK] Poll attributes completed');
  }



  /**
   * Read attribute with intelligent fallback
   * Tries multiple strategies until success
   */
  async readAttributeSafe(cluster, attribute) {
    try {
      return await this.fallback.readAttributeWithFallback(cluster, attribute).catch(err => this.error(err));
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
      return await this.fallback.configureReportWithFallback(config).catch(err => this.error(err));
    } catch (err) {
      this.error(`Failed to configure report after all fallback strategies:`, err);
      // Don't throw - use polling as ultimate fallback
      return { success: false, method: 'polling' };
    }
  }

  /**
   * IAS Zone enrollment with fallback
   */
}
  async enrollIASZoneSafe() {
  try {
    return await this.fallback.iasEnrollWithFallback().catch(err => this.error(err));
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

module.exports = SmartSwitch2gangHybridDevice;
