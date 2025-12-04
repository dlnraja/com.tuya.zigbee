'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * Switch 2-Gang Device - Mains Powered
 *
 * Supported: TS0002 _TZ3000_h1ipgkwn and variants
 *
 * Protocol: Standard Zigbee OnOff clusters
 * Power: Mains powered (NO battery)
 */
class SmartSwitch2gangHybridDevice extends AutoAdaptiveDevice {

  // Force mains powered - NO battery management
  get mainsPowered() { return true; }

  async onNodeInit({ zclNode }) {
    this.log('═══════════════════════════════════════════════════');
    this.log('[SWITCH-2GANG] Initializing (Mains Powered)...');
    this.log('═══════════════════════════════════════════════════');

    // Initialize base
    await super.onNodeInit({ zclNode }).catch(err => this.error(err));

    this.log('[SWITCH-2GANG] ✅ Initialized');

    // v5.2.86: Register ALL gang capabilities
    await this._setupGangCapabilities(zclNode);

    // Mark device as available
    try {
      await this.setAvailable().catch(err => this.error(err));
    } catch (err) { this.error('Await error:', err); }
  }

  /**
   * v5.2.86: Setup all gang capabilities with proper listeners
   */
  async _setupGangCapabilities(zclNode) {
    // Gang 1 (endpoint 1) - capability: onoff
    if (this.hasCapability('onoff')) {
      this.registerCapabilityListener('onoff', async (value) => {
        return this._setGangState(1, value);
      });
      await this._setupGangReporting(zclNode, 1, 'onoff');
      this.log('[SWITCH-2GANG] ✅ Gang 1 (onoff) registered');
    }

    // Gang 2 (endpoint 2) - capability: onoff.gang2
    if (this.hasCapability('onoff.gang2')) {
      this.registerCapabilityListener('onoff.gang2', async (value) => {
        return this._setGangState(2, value);
      });
      await this._setupGangReporting(zclNode, 2, 'onoff.gang2');
      this.log('[SWITCH-2GANG] ✅ Gang 2 (onoff.gang2) registered');
    }

    // Gang 3 (endpoint 3) - capability: onoff.gang3 (if exists)
    if (this.hasCapability('onoff.gang3')) {
      this.registerCapabilityListener('onoff.gang3', async (value) => {
        return this._setGangState(3, value);
      });
      await this._setupGangReporting(zclNode, 3, 'onoff.gang3');
      this.log('[SWITCH-2GANG] ✅ Gang 3 (onoff.gang3) registered');
    }

    // Gang 4 (endpoint 4) - capability: onoff.gang4 (if exists)
    if (this.hasCapability('onoff.gang4')) {
      this.registerCapabilityListener('onoff.gang4', async (value) => {
        return this._setGangState(4, value);
      });
      await this._setupGangReporting(zclNode, 4, 'onoff.gang4');
      this.log('[SWITCH-2GANG] ✅ Gang 4 (onoff.gang4) registered');
    }
  }

  /**
   * v5.2.86: Set gang state
   */
  async _setGangState(gang, value) {
    this.log(`[SWITCH-2GANG] Setting gang ${gang} to ${value}`);

    try {
      const endpoint = this.zclNode?.endpoints?.[gang];
      if (!endpoint?.clusters?.onOff) {
        this.error(`[SWITCH-2GANG] No onOff cluster on endpoint ${gang}`);
        return;
      }

      if (value) {
        await endpoint.clusters.onOff.setOn();
      } else {
        await endpoint.clusters.onOff.setOff();
      }
      this.log(`[SWITCH-2GANG] ✅ Gang ${gang} set to ${value}`);
    } catch (error) {
      this.error(`[SWITCH-2GANG] Error setting gang ${gang}:`, error.message);
      throw error;
    }
  }

  /**
   * v5.2.86: Setup reporting for a gang
   */
  async _setupGangReporting(zclNode, gang, capabilityId) {
    try {
      const endpoint = zclNode?.endpoints?.[gang];
      if (!endpoint?.clusters?.onOff) {
        this.log(`[SWITCH-2GANG] ⚠️ No onOff cluster on endpoint ${gang}`);
        return;
      }

      // Setup attribute listener for state changes
      endpoint.clusters.onOff.on('attr.onOff', (value) => {
        this.log(`[SWITCH-2GANG] 📡 Gang ${gang} state: ${value}`);
        this.setCapabilityValue(capabilityId, !!value).catch(this.error);
      });

      // Read initial state
      try {
        const attrs = await endpoint.clusters.onOff.readAttributes(['onOff']).catch(() => null);
        if (attrs?.onOff !== undefined) {
          await this.setCapabilityValue(capabilityId, !!attrs.onOff);
          this.log(`[SWITCH-2GANG] ✅ Gang ${gang} initial state: ${!!attrs.onOff}`);
        }
      } catch (err) {
        this.log(`[SWITCH-2GANG] ⚠️ Could not read initial state for gang ${gang}`);
      }

      // Configure reporting
      await endpoint.clusters.onOff.configureReporting({
        onOff: { minInterval: 0, maxInterval: 3600, minChange: 1 }
      }).catch(() => { });

    } catch (err) {
      this.error(`[SWITCH-2GANG] Reporting setup failed for gang ${gang}:`, err.message);
    }
  }

  // Legacy method kept for compatibility
  async onCapabilityOnoff(value, opts) {
    return this._setGangState(1, value);
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

    // v5.2.76: OnOff triggers with robust error handling
    if (capabilityId === 'onoff') {
      // Try multiple trigger ID formats
      const triggerIds = value
        ? [`${driverId}_turned_on`, 'turned_on', 'switch_turned_on']
        : [`${driverId}_turned_off`, 'turned_off', 'switch_turned_off'];

      let triggered = false;
      for (const triggerId of triggerIds) {
        try {
          const card = this.homey.flow.getDeviceTriggerCard(triggerId);
          if (card) {
            await card.trigger(this).catch(() => { });
            this.log(`[FLOW] ✅ Triggered: ${triggerId}`);
            triggered = true;
            break;
          }
        } catch (err) {
          // Card doesn't exist, try next
        }
      }
      if (!triggered) {
        this.log(`[FLOW] ℹ️ No flow card found for onoff=${value} (normal if no flows defined)`);
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


module.exports = SmartSwitch2gangHybridDevice;
