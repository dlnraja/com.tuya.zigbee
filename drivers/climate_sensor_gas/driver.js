'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GasDetectorDriver extends ZigBeeDriver {
  getDeviceById(id) {
    try {
      return super.getDeviceById(id);
    } catch (err) {
      this.error(`[CRASH-PREVENTION] Could not get device by id: ${id} - ${err.message}`);
      return null;
    }
  }

  async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('GasDetectorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["climate_sensor_gas_gas_detector_gas_detected","climate_sensor_gas_gas_detector_gas_cleared","climate_sensor_gas_gas_detector_co_detected","climate_sensor_gas_gas_detector_co_cleared","climate_sensor_gas_gas_detector_tamper_true","climate_sensor_gas_gas_detector_battery_changed","climate_sensor_gas_gas_detector_battery_low","climate_sensor_gas_gas_detector_co_alarm","climate_sensor_gas_gas_detector_gas_alarm"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) return;
            args.device.emit("flow:" + _tid, args);
          });
        }
      } catch (_err) { this.error("Trigger " + _tid + ": " + _err.message); }
    }
    // END TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('climate_sensor_gas_detector_gas_is_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition climate_sensor_gas_gas_detector_gas_is_detected: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('climate_sensor_gas_detector_co_is_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition climate_sensor_gas_gas_detector_co_is_detected: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('climate_sensor_gas_detector_co_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition climate_sensor_gas_gas_detector_co_active: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('climate_sensor_gas_detector_gas_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition climate_sensor_gas_gas_detector_gas_active: ${err.message}`); }; }

    // ACTIONS
    try {
      const card = this.homey.flow.getActionCard('climate_sensor_gas_detector_test');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action climate_sensor_gas_gas_detector_test triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_gas_gas_detector_test: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getActionCard('climate_sensor_gas_detector_mute');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action climate_sensor_gas_gas_detector_mute triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Action climate_sensor_gas_gas_detector_mute: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = GasDetectorDriver;

