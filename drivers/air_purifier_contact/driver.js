'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LonsonhoContactSensorDriver extends ZigBeeDriver {
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
    this.log('LonsonhoContactSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["air_purifier_contact_contact_sensor_opened","air_purifier_contact_contact_sensor_closed","air_purifier_contact_contact_sensor_tamper_true","air_purifier_contact_contact_sensor_battery_changed","air_purifier_contact_contact_sensor_battery_low","air_purifier_contact_contact_sensor_left_open","air_purifier_contact_contact_sensor_contact_alarm","air_purifier_contact_contact_sensor_tamper_alarm"];
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
      const card = this.homey.flow.getConditionCard('air_purifier_contact_contact_sensor_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_contact_contact_sensor_is_open: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_contact_contact_sensor_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
      }
    } catch (err) { this.error(`Condition air_purifier_contact_contact_sensor_battery_above: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_contact_contact_sensor_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_contact_contact_sensor_contact_open: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('air_purifier_contact_contact_sensor_tamper_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition air_purifier_contact_contact_sensor_tamper_active: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = LonsonhoContactSensorDriver;

