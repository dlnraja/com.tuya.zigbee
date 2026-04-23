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
    try { this.homey.flow.getTriggerCard('gas_detector_gas_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_gas_cleared'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_co_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_co_cleared'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_tamper_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_battery_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_co_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('gas_detector_gas_alarm'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('gas_detector_gas_is_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_detector_gas_is_detected: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_detector_co_is_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_detector_co_is_detected: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_detector_co_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_detector_co_active: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('gas_detector_gas_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition gas_detector_gas_active: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('gas_detector_test');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action gas_detector_test triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action gas_detector_test: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getActionCard('gas_detector_mute');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action gas_detector_mute triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action gas_detector_mute: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = GasDetectorDriver;
