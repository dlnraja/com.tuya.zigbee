'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class CoSensorDriver extends ZigBeeDriver {
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
    this.log('CoSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('co_sensor_alarm_co_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('co_sensor_alarm_co_false'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('co_sensor_measure_co_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('co_sensor_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('co_sensor_tamper_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('co_sensor_tamper_false'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('co_sensor_co_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('co_sensor_tamper_alarm'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('co_sensor_co_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition co_sensor_co_detected: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('co_sensor_co_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition co_sensor_co_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('co_sensor_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
      }
    } catch (err) { this.error(`Condition co_sensor_battery_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('co_sensor_co_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition co_sensor_co_active: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('co_sensor_tamper_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition co_sensor_tamper_active: ${err.message}`); }

    // ACTIONS
    try {
      const card = const card = this.homey.flow.getActionCard('co_sensor_test_alarm');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          // Generic action handler
          this.log('[FLOW] Action co_sensor_test_alarm triggered for', args.device.getName());
          return true;
        });
      }
    } catch (err) { this.error(`Action co_sensor_test_alarm: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = CoSensorDriver;
