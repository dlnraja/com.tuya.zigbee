'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');

class RollerShutterControllerDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    
    // Register capabilities
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapability('windowcoverings_set', 'genLevelCtrl', {
        set: 'moveToLevelWithOnOff',
        setParser(value) {
          return {
            level: Math.round(value * 254),
            transtime: 1
          };
        }
      });
    }

    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapability('windowcoverings_state', 'genLevelCtrl');
    }

    // Battery reporting
    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        getOpts: {
          getOnStart: true,
        },
        reportParser: value => value < 20
      });
    }

    await super.onNodeInit({ zclNode });
  }


  async setCapabilityValue(capabilityId, value) {
    await super.setCapabilityValue(capabilityId, value);
    await this.triggerCapabilityFlow(capabilityId, value);
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
      const isOnCard = this.homey.flow.getDeviceConditionCard('roller_shutter_controller_is_on');
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
        const conditionCard = this.homey.flow.getDeviceConditionCard(`roller_shutter_controller_${alarmCap}_is_active`);
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
        const gtCard = this.homey.flow.getDeviceConditionCard(`roller_shutter_controller_${measureCap}_greater_than`);
        if (gtCard) {
          gtCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.greater === '>') return value > args.value;
            if (args.greater === '>=') return value >= args.value;
            return false;
          });
        }

        // Less than
        const ltCard = this.homey.flow.getDeviceConditionCard(`roller_shutter_controller_${measureCap}_less_than`);
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
      const turnOnCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_turn_on');
      if (turnOnCard) {
        turnOnCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('onoff', true);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Turn Off
    try {
      const turnOffCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_turn_off');
      if (turnOffCard) {
        turnOffCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('onoff', false);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Toggle
    try {
      const toggleCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_toggle');
      if (toggleCard) {
        toggleCard.registerRunListener(async (args, state) => {
          const current = args.device.getCapabilityValue('onoff');
          await args.device.setCapabilityValue('onoff', !current);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Set Dim
    try {
      const setDimCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_set_dim');
      if (setDimCard) {
        setDimCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('dim', args.dim);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Set Temperature
    try {
      const setTempCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_set_temperature');
      if (setTempCard) {
        setTempCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('target_temperature', args.temperature);
        });
      }
    } catch (error) {
      // Card might not exist
    }

    // Action: Window Coverings
    try {
      const openCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_open');
      if (openCard) {
        openCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 1);
        });
      }

      const closeCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_close');
      if (closeCard) {
        closeCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 0);
        });
      }

      const setPosCard = this.homey.flow.getDeviceActionCard('roller_shutter_controller_set_position');
      if (setPosCard) {
        setPosCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', args.position);
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
              await args.device.setCapabilityValue('onoff', true);
              await new Promise(resolve => setTimeout(resolve, 300));
              await args.device.setCapabilityValue('onoff', false);
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            await args.device.setCapabilityValue('onoff', original);
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
            await args.device.setCapabilityValue('meter_power', 0);
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
          await this.homey.flow.getDeviceTriggerCard(triggerIdTrue).trigger(this);
          this.log(`Triggered: ${triggerIdTrue}`);
        } else if (value === false) {
          await this.homey.flow.getDeviceTriggerCard(triggerIdFalse).trigger(this);
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
        await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this, { value });
        this.log(`Triggered: ${triggerId} with value: ${value}`);
      } catch (error) {
        this.error(`Error triggering ${capabilityId}:`, error.message);
      }
    }
    
    // OnOff triggers
    if (capabilityId === 'onoff') {
      const triggerId = value ? `${driverId}_turned_on` : `${driverId}_turned_off`;
      try {
        await this.homey.flow.getDeviceTriggerCard(triggerId).trigger(this);
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
   * INTELLIGENT BATTERY MONITORING
   * Auto-generated by IntelligentBatteryManager
   */
  
  async monitorBattery() {
    try {
      const batteryLevel = this.getCapabilityValue('measure_battery');
      
      if (batteryLevel !== null && batteryLevel !== undefined) {
        // Battery level categorization
        if (batteryLevel <= 10) {
          this.setWarning('⚠️ CRITICAL: Battery ' + batteryLevel + '% - Replace immediately!');
          this.log('Battery CRITICAL:', batteryLevel + '%');
        } else if (batteryLevel <= 20) {
          this.setWarning('Battery low: ' + batteryLevel + '% - Replace soon');
          this.log('Battery LOW:', batteryLevel + '%');
        } else if (batteryLevel <= 30) {
          this.log('Battery WARNING level:', batteryLevel + '%');
        } else {
          this.unsetWarning();
        }
        
        // Battery type info
        const supportedBatteries = ["CR2032","AAA","AA"];
        this.log('Supported batteries:', supportedBatteries.join(', '));
        
        // Estimate remaining time
        if (batteryLevel <= 20) {
          const estimatedDays = Math.floor((batteryLevel / 20) * 30);
          this.log('Estimated remaining: ~' + estimatedDays + ' days');
        }
      }
    } catch (err) {
      this.error('Battery monitoring error:', err);
    }
  }
  
  /**
   * Battery change detection
   */
  async detectBatteryChange(oldValue, newValue) {
    try {
      // Detect battery replacement (jump from low to high)
      if (oldValue < 30 && newValue > 80) {
        this.log('🔋 Battery replaced detected!');
        if (this.homey && this.homey.flow) {
          this.homey.flow.getDeviceTriggerCard('device_battery_changed')
            .trigger(this, { old_battery: oldValue, new_battery: newValue })
            .catch(err => this.error('Flow trigger error:', err));
        }
        
        // Reset warnings
        this.unsetWarning();
      }
    } catch (err) {
      this.error('Battery change detection error:', err);
    }
  }

}

module.exports = RollerShutterControllerDevice;
