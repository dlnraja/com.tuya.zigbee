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
    const _triggerIds = ["sensor_contact_rain_contact_sensor_opened","sensor_contact_rain_contact_sensor_closed","sensor_contact_rain_contact_sensor_tamper_true","sensor_contact_rain_contact_sensor_battery_changed","sensor_contact_rain_contact_sensor_battery_low","sensor_contact_rain_contact_sensor_left_open","sensor_contact_rain_contact_sensor_contact_alarm","sensor_contact_rain_contact_sensor_tamper_alarm"];
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
      const card = this.homey.flow.getConditionCard('sensor_contact_rain_contact_sensor_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_contact_rain_contact_sensor_is_open: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_contact_rain_contact_sensor_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
      }
    } catch (err) { this.error(`Condition sensor_contact_rain_contact_sensor_battery_above: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_contact_rain_contact_sensor_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_contact_rain_contact_sensor_contact_open: ${err.message}`); }

    try {
      const card = this.homey.flow.getConditionCard('sensor_contact_rain_contact_sensor_tamper_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition sensor_contact_rain_contact_sensor_tamper_active: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = LonsonhoContactSensorDriver;

