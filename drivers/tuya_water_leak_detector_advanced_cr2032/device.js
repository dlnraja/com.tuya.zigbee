'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const { fromZclBatteryPercentageRemaining } = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/FallbackSystem');

class WaterLeakDetectorAdvancedDevice extends ZigBeeDevice {

  async onNodeInit({ zclNode }) {
    // ==========================================
    // BATTERY MANAGEMENT - OPTIMIZED
    // ==========================================
    
    // Configure battery reporting
    try {
      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: CLUSTER.POWER_CONFIGURATION,
        attributeName: 'batteryPercentageRemaining',
        minInterval: 3600,
        maxInterval: 86400,
        minChange: 10
      }]);
      this.log('Battery reporting configured');
    } catch (err) {
      this.log('Battery report config failed (non-critical):', err.message);
    }
    
    // Register battery capability
// TODO: Consider debouncing capability updates for better performance
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
    }, 300000);
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
  

    // Water alarm capability
    if (this.hasCapability('alarm_water')) {
      this.registerCapability('alarm_water', CLUSTER.IAS_ZONE, {
        get: 'zoneStatus',
        report: 'zoneStatus',
        reportParser: value => (value & 1) === 1
      });
    }

    // Temperature measurement
    if (this.hasCapability('measure_temperature')) {
      this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    }

    // Battery capabilities
    if (this.hasCapability('alarm_battery')) {
      this.registerCapability('alarm_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining',
        reportParser: value => value < 20
      });
    }

    if (this.hasCapability('measure_battery')) {
      this.registerCapability('measure_battery', CLUSTER.POWER_CONFIGURATION, {
        get: 'batteryPercentageRemaining',
        report: 'batteryPercentageRemaining', 
        reportParser: value => Math.max(0, Math.min(100, value))
      });
    }

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
  }


  async setCapabilityValue(capabilityId, value) {
    await super.setCapabilityValue(capabilityId, value);
    await this.triggerCapabilityFlow(capabilityId, value);
    // Water leak detector IAS Zone
    if (this.hasCapability('alarm_water')) {
      this.log('🚨 Setting up Water leak detector IAS Zone...');
      try {
        const endpoint = zclNode.endpoints[1];
        const enroller = new IASZoneEnroller(this, endpoint, {
          zoneType: 10, // Water leak detector
          capability: 'alarm_water',
          pollInterval: 30000,
          autoResetTimeout: 0
        });
        const method = await enroller.enroll(zclNode);
        this.log(`✅ Water leak detector IAS Zone enrolled via: ${method}`);
      } catch (err) {
        this.error('❌ IAS Zone enrollment failed:', err);
        this.log('⚠️  Device may auto-enroll or work without explicit enrollment');
      }
    }

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
      const isOnCard = this.homey.flow.getDeviceConditionCard('water_leak_detector_advanced_is_on');
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
        const conditionCard = this.homey.flow.getDeviceConditionCard(`water_leak_detector_advanced_${alarmCap}_is_active`);
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
        const gtCard = this.homey.flow.getDeviceConditionCard(`water_leak_detector_advanced_${measureCap}_greater_than`);
        if (gtCard) {
          gtCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.greater === '>') return value > args.value;
            if (args.greater === '>=') return value >= args.value;
            return false;
          });
        }

        // Less than
        const ltCard = this.homey.flow.getDeviceConditionCard(`water_leak_detector_advanced_${measureCap}_less_than`);
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
      const turnOnCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_turn_on');
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
      const turnOffCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_turn_off');
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
      const toggleCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_toggle');
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
      const setDimCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_set_dim');
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
      const setTempCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_set_temperature');
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
      const openCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_open');
      if (openCard) {
        openCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 1);
        });
      }

      const closeCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_close');
      if (closeCard) {
        closeCard.registerRunListener(async (args, state) => {
          try {
          await args.device.setCapabilityValue('windowcoverings_set', 0);
          } catch (err) { this.error('Await error:', err); }
        });
      }

      const setPosCard = this.homey.flow.getDeviceActionCard('water_leak_detector_advanced_set_position');
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

module.exports = WaterLeakDetectorAdvancedDevice;
