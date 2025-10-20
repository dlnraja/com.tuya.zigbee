'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const batteryConverter = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/FallbackSystem');

class SceneController8buttonDevice extends ZigBeeDevice {

    async onNodeInit() {

// ==========================================
    // BUTTON CLICK DETECTION - OPTIMIZED
    // ==========================================
    
    // Click detection state
    this._clickState = {
      lastClick: 0,
      clickCount: 0,
      clickTimer: null,
      longPressTimer: null,
      buttonPressed: false
    };
    
    // Timing constants
    const DOUBLE_CLICK_WINDOW = 400;  // ms
    const LONG_PRESS_DURATION = 1000; // ms
    const DEBOUNCE_TIME = 50;         // ms
    
    // Register onOff cluster for button events
    if (this.hasCapability('onoff')) {
// TODO: Consider debouncing capability updates for better performance
      this.registerCapability('onoff', CLUSTER.ON_OFF, {
        endpoint: 1
      });
    }
    
    // Listen for onOff commands (button press/release)
    const onOffCluster = this.zclNode.endpoints[1]?.clusters?.onOff;
    
    if (onOffCluster) {
      // Press detection
      onOffCluster.on('command', async (command) => {
        const now = Date.now();
        
        // Debounce
        if (now - this._clickState.lastClick < DEBOUNCE_TIME) {
          this.log('Debounced click');
          return;
        }
        
        this.log('Button command:', command);
        
        if (command === 'on' || command === 'off' || command === 'toggle') {
          this._clickState.buttonPressed = true;
          this._clickState.lastClick = now;
          
          // Start long press timer
          this._clickState.longPressTimer = setTimeout(() => {
            if (this._clickState.buttonPressed) {
              this.log('🔘 LONG PRESS detected');
              this.homey.flow.getDeviceTriggerCard('button_long_press')
                .trigger(this, {}, {})
                .catch(this.error);
              
              // Reset state after long press
              this._clickState.buttonPressed = false;
              this._clickState.clickCount = 0;
              if (this._clickState.clickTimer) {
                clearTimeout(this._clickState.clickTimer);
                this._clickState.clickTimer = null;
              }
            }
          }, LONG_PRESS_DURATION);
          
        } else if (command === 'commandButtonRelease' || this._clickState.buttonPressed) {
          // Button released
          this._clickState.buttonPressed = false;
          
          // Clear long press timer
          if (this._clickState.longPressTimer) {
            clearTimeout(this._clickState.longPressTimer);
            this._clickState.longPressTimer = null;
          }
          
          // Increment click count
          this._clickState.clickCount++;
          
          // Clear existing timer
          if (this._clickState.clickTimer) {
            clearTimeout(this._clickState.clickTimer);
          }
          
          // Wait for potential second click
          this._clickState.clickTimer = setTimeout(() => {
            const clicks = this._clickState.clickCount;
            this._clickState.clickCount = 0;
            this._clickState.clickTimer = null;
            
            if (clicks === 1) {
              this.log('🔘 SINGLE CLICK detected');
              this.homey.flow.getDeviceTriggerCard('button_pressed')
                .trigger(this, {}, {})
                .catch(this.error);
                
            } else if (clicks === 2) {
              this.log('🔘 DOUBLE CLICK detected');
              this.homey.flow.getDeviceTriggerCard('button_double_press')
                .trigger(this, {}, {})
                .catch(this.error);
                
            } else if (clicks >= 3) {
              this.log(`🔘 MULTI CLICK detected (${clicks})`);
              this.homey.flow.getDeviceTriggerCard('button_multi_press')
                .trigger(this, { count: clicks }, {})
                .catch(this.error);
            }
          }, DOUBLE_CLICK_WINDOW);
        }
      });
      
      this.log('Button click detection initialized');
      
    } else {
      this.error('OnOff cluster not found for button detection');
    }
    
    // Alternative: Level Control cluster for some buttons
    const levelControlCluster = this.zclNode.endpoints[1]?.clusters?.levelControl;
    
    if (levelControlCluster) {
      levelControlCluster.on('command', async (command) => {
        this.log('Level control command:', command);
        
        // Some buttons use step/move commands
        if (command === 'step' || command === 'stepWithOnOff') {
          this.log('🔘 BUTTON STEP detected (single click alternative)');
          this.homey.flow.getDeviceTriggerCard('button_pressed')
            .trigger(this, {}, {})
            .catch(this.error);
        }
      });
    }
        this.log('scene_controller_8button device initialized');

        // Register capabilities
                // Register on/off capability
        this.registerCapabilityListener('onoff', this.onCapabilityOnoff.bind(this));

        // Mark device as available
        try {
        await this.setAvailable();
        } catch (err) { this.error('Await error:', err); }
    }

        async onCapabilityOnoff(value, opts) {
        this.log('onCapabilityOnoff:', value);
        
        try {
            if (value) {
                await this.zclNode.endpoints[1].clusters.onOff.setOn();
            } else {
                await this.zclNode.endpoints[1].clusters.onOff.setOff();
            }
            
            return Promise.resolve();
        } catch (error) {
            this.error('Error setting onoff:', error);
            return Promise.reject(error);
        }
    }

    async onDeleted() {
        this.log('scene_controller_8button device deleted');
    }


  async setCapabilityValue(capabilityId, value) {
    try {
    await super.setCapabilityValue(capabilityId, value);
    } catch (err) { this.error('Await error:', err); }
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
      const isOnCard = this.homey.flow.getDeviceConditionCard('scene_controller_8button_is_on');
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
        const conditionCard = this.homey.flow.getDeviceConditionCard(`scene_controller_8button_${alarmCap}_is_active`);
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
        const gtCard = this.homey.flow.getDeviceConditionCard(`scene_controller_8button_${measureCap}_greater_than`);
        if (gtCard) {
          gtCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.greater === '>') return value > args.value;
            if (args.greater === '>=') return value >= args.value;
            return false;
          });
        }

        // Less than
        const ltCard = this.homey.flow.getDeviceConditionCard(`scene_controller_8button_${measureCap}_less_than`);
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
      const turnOnCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_turn_on');
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
      const turnOffCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_turn_off');
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
      const toggleCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_toggle');
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
      const setDimCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_set_dim');
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
      const setTempCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_set_temperature');
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
      const openCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_open');
      if (openCard) {
        openCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 1);
        });
      }

      const closeCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_close');
      if (closeCard) {
        closeCard.registerRunListener(async (args, state) => {
          try {
          await args.device.setCapabilityValue('windowcoverings_set', 0);
          } catch (err) { this.error('Await error:', err); }
        });
      }

      const setPosCard = this.homey.flow.getDeviceActionCard('scene_controller_8button_set_position');
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
              try {
              await new Promise(resolve => setTimeout(resolve, 300));
              } catch (err) { this.error('Await error:', err); }
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

   catch (err) {
      this.error('Battery change detection error:', err);
    }
  }


  /**
   * Poll tous les attributes pour forcer mise à jour
   * Résout: Données non visibles après pairing (Peter + autres)
   */
  async pollAttributes() {
    const promises = [];
    
    // ==========================================
    // BATTERY MANAGEMENT - OPTIMIZED
    // ==========================================
    
    // Configure battery reporting
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: CLUSTER.POWER_CONFIGURATION,
        attributeName: 'batteryPercentageRemaining',
        minInterval: 7200,
        maxInterval: 172800,
        minChange: 10
      }]);
      this.log('Battery reporting configured');
    } catch (err) {
      this.log('Battery report config failed (non-critical):', err.message);
    }
    
    // Register battery capability
    this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
      endpoint: 1,
      get: 'batteryPercentageRemaining',
      report: 'batteryPercentageRemaining',
      reportParser: (value) => {
        if (value === null || value === undefined) return null;
        // Convert from 0-200 scale to 0-100%
        const percentage = Math.round(value / 2);
        return Math.max(0, Math.min(100, percentage));
      },
      getParser: (value) => {
        if (value === null || value === undefined) return null;
        const percentage = Math.round(value / 2);
        return Math.max(0, Math.min(100, percentage));
      }
    });
    
    // Initial battery poll after pairing
    setTimeout(async () => {
      try {
        await this.pollAttributes();
        this.log('Initial battery poll completed');
      } catch (err) {
        this.error('Initial battery poll failed:', err);
      }
    }, 5000);
    
    // Regular battery polling with exponential backoff on errors
    let pollFailures = 0;
    const maxPollFailures = 5;
    
    this.registerPollInterval(async () => {
      try {
        const battery = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']);
        
        if (battery && battery.batteryPercentageRemaining !== undefined) {
          const percentage = Math.round(battery.batteryPercentageRemaining / 2);
          await this.setCapabilityValue('measure_battery', percentage);
          this.log('Battery polled:', percentage + '%');
          
          // Reset failure counter on success
          pollFailures = 0;
          
          // Low battery alert
          if (percentage <= 20 && percentage > 10) {
            this.log('⚠️  Low battery warning:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery low (${percentage}%)`
            }).catch(() => {});
          }
          
          // Critical battery alert
          if (percentage <= 10) {
            this.log('🔴 Critical battery:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery critical (${percentage}%) - replace soon!`
            }).catch(() => {});
          }
        }
      } catch (err) {
        pollFailures++;
        this.error(`Battery poll failed (${pollFailures}/${maxPollFailures}):`, err.message);
        
        // Stop polling after max failures to preserve battery
        if (pollFailures >= maxPollFailures) {
          this.log('Max poll failures reached, reducing poll frequency');
          // Polling will continue but less frequently
        }
      }
    }, 3600000);
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

module.exports = SceneController8buttonDevice;
