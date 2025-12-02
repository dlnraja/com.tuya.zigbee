'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');
const { CLUSTER } = require('zigbee-clusters');
const IASZoneEnroller = require('../../lib/IASZoneEnroller');
const batteryConverter = require('../../lib/tuya-engine/converters/battery');
const FallbackSystem = require('../../lib/helpers/FallbackSystem');

class SmartCurtainMotorDevice extends BaseHybridDevice {

  async onNodeInit({ zclNode }) {
    this.log('');
    this.log('╔═══════════════════════════════════════════════════════════════════╗');
    this.log('║           CURTAIN MOTOR v5.2.96 - POWER DETECTION                 ║');
    this.log('╚═══════════════════════════════════════════════════════════════════╝');

    try {
      await super.onNodeInit({ zclNode }).catch(err => this.error(err));
    } catch (err) { this.error('Await error:', err); }

    // Detect protocol: Tuya DP (TS0601) vs Standard ZCL (TS0302/TS130F)
    const endpoint = zclNode?.endpoints?.[1];
    const hasTuyaCluster = !!(endpoint?.clusters?.tuya || endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.[61184]);
    const hasWindowCovering = !!endpoint?.clusters?.closuresWindowCovering;
    const hasBatteryCluster = !!endpoint?.clusters?.powerConfiguration;

    this.log(`[CURTAIN] Protocol: Tuya DP=${hasTuyaCluster}, WindowCovering=${hasWindowCovering}`);
    this.log(`[CURTAIN] Power: Battery cluster=${hasBatteryCluster}`);

    // v5.2.96: Detect power source - most curtain motors are MAINS powered
    if (!hasBatteryCluster) {
      this.log('[CURTAIN] ⚡ MAINS POWERED - No battery cluster detected');
      this.powerType = 'MAINS';

      // Remove measure_battery if incorrectly present
      if (this.hasCapability('measure_battery')) {
        this.log('[CURTAIN] ➖ Removing incorrect measure_battery capability');
        await this.removeCapability('measure_battery').catch(() => { });
      }
    } else {
      this.log('[CURTAIN] 🔋 BATTERY POWERED - Battery cluster present');
      this.powerType = 'BATTERY';

      // Add measure_battery if missing
      if (!this.hasCapability('measure_battery')) {
        await this.addCapability('measure_battery').catch(() => { });
      }
    }

    if (hasTuyaCluster) {
      // TS0601 Tuya DP protocol
      await this._setupTuyaDPCurtain();
    } else if (hasWindowCovering) {
      // Standard ZCL Window Covering cluster (258)
      this.registerCapability('windowcoverings_state', 258);
      this.registerCapability('windowcoverings_set', 258);

      await this.configureAttributeReporting([{
        endpointId: 1,
        cluster: { id: 258, attributes: ['currentPositionLiftPercentage'] }
      }]).catch(this.error);
    }
  }

  /**
   * Setup Tuya DP listener for TS0601 curtain motors
   *
   * DP Mapping (Zigbee2MQTT tuya.ts):
   * - DP 1: control (enum: open=0, stop=1, close=2)
   * - DP 2: position (0-100%)
   * - DP 3: position (alternative, inverted)
   * - DP 5: direction setting
   * - DP 7: work_state (enum: opening=0, closing=1, stop=2)
   * - DP 103: position (some models)
   */
  async _setupTuyaDPCurtain() {
    this.log('[CURTAIN] Setting up Tuya DP for curtain motor...');

    const endpoint = this.zclNode?.endpoints?.[1];
    if (!endpoint) return;

    const tuyaCluster = endpoint.clusters?.tuya || endpoint.clusters?.manuSpecificTuya || endpoint.clusters?.[61184];
    if (!tuyaCluster) {
      this.log('[CURTAIN] No Tuya cluster found');
      return;
    }

    // Register capability listener for position
    if (this.hasCapability('windowcoverings_set')) {
      this.registerCapabilityListener('windowcoverings_set', async (value) => {
        const position = Math.round(value * 100);
        this.log(`[CURTAIN] Setting position to ${position}%`);
        await this._sendTuyaDP(2, 'value', position);
      });
    }

    // Register capability listener for state
    if (this.hasCapability('windowcoverings_state')) {
      this.registerCapabilityListener('windowcoverings_state', async (value) => {
        this.log(`[CURTAIN] Setting state to ${value}`);
        const control = value === 'up' ? 0 : value === 'down' ? 2 : 1; // open=0, close=2, stop=1
        await this._sendTuyaDP(1, 'enum', control);
      });
    }

    // Listen for DP reports
    if (this.tuyaEF00Manager) {
      this.tuyaEF00Manager.on('dpReport', ({ dpId, value }) => {
        this._handleCurtainDP(dpId, value);
      });
    }

    // Direct cluster listener
    if (typeof tuyaCluster.on === 'function') {
      tuyaCluster.on('dataReport', (data) => {
        this.log('[CURTAIN] Raw dataReport:', JSON.stringify(data));
        if (data?.dp !== undefined) {
          this._handleCurtainDP(data.dp, data.value);
        }
      });
    }

    tuyaCluster.onDataReport = (data) => {
      if (data?.dp !== undefined) {
        this._handleCurtainDP(data.dp, data.value);
      }
    };

    this.log('[CURTAIN] Tuya DP listener configured');

    // v5.2.96: Request initial position after 3s (mains devices respond quickly)
    setTimeout(async () => {
      this.log('[CURTAIN] 📡 Requesting initial position...');
      try {
        // Request position DP
        if (this.tuyaEF00Manager) {
          await this.tuyaEF00Manager.getData(2).catch(() => { }); // Position
          await this.tuyaEF00Manager.getData(1).catch(() => { }); // Control state
        }
        this.log('[CURTAIN] ✅ Initial DP request sent');
      } catch (err) {
        this.log('[CURTAIN] ⚠️ Initial DP request failed (will retry on device wake)');
      }
    }, 3000);
  }

  /**
   * Handle incoming Tuya DP for curtain motors
   */
  _handleCurtainDP(dpId, value) {
    this.log(`[CURTAIN] DP${dpId} = ${value}`);

    switch (dpId) {
      case 1: // Control command feedback
        const stateMap = { 0: 'up', 1: 'idle', 2: 'down' };
        const state = stateMap[value] || 'idle';
        this.log(`[CURTAIN] Control: ${state}`);
        if (this.hasCapability('windowcoverings_state')) {
          this.setCapabilityValue('windowcoverings_state', state).catch(this.error);
        }
        break;

      case 2: // Position (0-100)
      case 3: // Alternative position DP
      case 103: // Some models use DP103
        const position = Math.max(0, Math.min(100, value)) / 100;
        this.log(`[CURTAIN] Position: ${Math.round(position * 100)}%`);
        if (this.hasCapability('windowcoverings_set')) {
          this.setCapabilityValue('windowcoverings_set', position).catch(this.error);
        }
        if (this.hasCapability('dim')) {
          this.setCapabilityValue('dim', position).catch(this.error);
        }
        break;

      case 5: // Direction setting
        this.log(`[CURTAIN] Direction: ${value}`);
        break;

      case 7: // Work state
        const workStateMap = { 0: 'up', 1: 'down', 2: 'idle' };
        const workState = workStateMap[value] || 'idle';
        this.log(`[CURTAIN] Work state: ${workState}`);
        if (this.hasCapability('windowcoverings_state')) {
          this.setCapabilityValue('windowcoverings_state', workState).catch(this.error);
        }
        break;

      default:
        this.log(`[CURTAIN] Unknown DP${dpId} = ${value}`);
    }
  }

  /**
   * Send Tuya DP command
   */
  async _sendTuyaDP(dp, dataType, value) {
    try {
      const endpoint = this.zclNode?.endpoints?.[1];
      const tuyaCluster = endpoint?.clusters?.tuya || endpoint?.clusters?.manuSpecificTuya || endpoint?.clusters?.[61184];

      if (!tuyaCluster) {
        this.error('[CURTAIN] No Tuya cluster for sending');
        return;
      }

      // Use TuyaEF00Manager if available
      if (this.tuyaEF00Manager) {
        await this.tuyaEF00Manager.setData(dp, value);
        return;
      }

      // Direct send
      const seq = Date.now() % 65535;
      let dataBuffer;

      if (dataType === 'enum') {
        dataBuffer = Buffer.from([dp, 4, 0, 1, value]);
      } else if (dataType === 'value') {
        dataBuffer = Buffer.alloc(8);
        dataBuffer.writeUInt8(dp, 0);
        dataBuffer.writeUInt8(2, 1); // type: value
        dataBuffer.writeUInt16BE(4, 2); // length
        dataBuffer.writeUInt32BE(value, 4);
      } else {
        dataBuffer = Buffer.from([dp, 1, 0, 1, value ? 1 : 0]);
      }

      await tuyaCluster.dataRequest({ seq, dpValues: dataBuffer });
      this.log(`[CURTAIN] Sent DP${dp} = ${value}`);
    } catch (err) {
      this.error('[CURTAIN] Send DP error:', err.message);
    }
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
      const isOnCard = this.homey.flow.getDeviceConditionCard('smart_curtain_motor_is_on');
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
        const conditionCard = this.homey.flow.getDeviceConditionCard(`smart_curtain_motor_${alarmCap}_is_active`);
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
        const gtCard = this.homey.flow.getDeviceConditionCard(`smart_curtain_motor_${measureCap}_greater_than`);
        if (gtCard) {
          gtCard.registerRunListener(async (args, state) => {
            const value = args.device.getCapabilityValue(measureCap);
            if (args.greater === '>') return value > args.value;
            if (args.greater === '>=') return value >= args.value;
            return false;
          });
        }

        // Less than
        const ltCard = this.homey.flow.getDeviceConditionCard(`smart_curtain_motor_${measureCap}_less_than`);
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
      const turnOnCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_turn_on');
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
      const turnOffCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_turn_off');
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
      const toggleCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_toggle');
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
      const setDimCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_set_dim');
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
      const setTempCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_set_temperature');
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
      const openCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_open');
      if (openCard) {
        openCard.registerRunListener(async (args, state) => {
          await args.device.setCapabilityValue('windowcoverings_set', 1).catch(err => this.error(err));
        });
      }

      const closeCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_close');
      if (closeCard) {
        closeCard.registerRunListener(async (args, state) => {
          try {
            await args.device.setCapabilityValue('windowcoverings_set', 0).catch(err => this.error(err));
          } catch (err) { this.error('Await error:', err); }
        });
      }

      const setPosCard = this.homey.flow.getDeviceActionCard('smart_curtain_motor_set_position');
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

  async triggerFlowCard(cardId, tokens = {}) {
    try {
      const flowCard = this.homey.flow.getDeviceTriggerCard(cardId);
      await flowCard.trigger(this, tokens).catch(err => this.error(err));
      this.log(`[OK] Flow triggered: ${cardId}`, tokens);
    } catch (err) {
      this.error(`[ERROR] Flow trigger error: ${cardId}`, err);
    }
  }

  // ========================================
  // FLOW METHODS - Auto-generated
  // ========================================

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
        cluster: 1,
        attributeName: 'batteryPercentageRemaining',
        minInterval: 7200,
        maxInterval: 86400,
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
        await this.pollAttributes().catch(err => this.error(err));
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
        const battery = await this.zclNode.endpoints[1].clusters.powerConfiguration.readAttributes(['batteryPercentageRemaining']).catch(err => this.error(err));

        if (battery && battery.batteryPercentageRemaining !== undefined) {
          const percentage = Math.round(battery.batteryPercentageRemaining / 2);
          await (async () => {
            this.log(`📝 [DIAG] setCapabilityValue: ${'measure_battery'} = ${parseFloat(percentage)}`);
            try {
              await this.setCapabilityValue('measure_battery', parseFloat(percentage));
              this.log(`✅ [DIAG] setCapabilityValue SUCCESS: ${'measure_battery'}`);
            } catch (err) {
              this.error(`❌ [DIAG] setCapabilityValue FAILED: ${'measure_battery'}`, err.message);
              throw err;
            }
          })().catch(err => this.error(err));
          this.log('Battery polled:', percentage + '%');

          // Reset failure counter on success
          pollFailures = 0;

          // Low battery alert
          if (percentage <= 20 && percentage > 10) {
            this.log('[WARN]  Low battery warning:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery low (${percentage}%)`
            }).catch(() => { });
          }

          // Critical battery alert
          if (percentage <= 10) {
            this.log('🔴 Critical battery:', percentage + '%');
            await this.homey.notifications.createNotification({
              excerpt: `${this.getName()} battery critical (${percentage}%) - replace soon!`
            }).catch(() => { });
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
    }, 600000);
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

module.exports = SmartCurtainMotorDevice;
