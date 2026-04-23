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
    await super// Sleepy device: Use Passive Mode (SLEEPY_TUYA_56_YEARS_BUG.md)
    .onInit();
    if (this._flowCardsRegistered) return;
    this._flowCardsRegistered = true;
    this.log('LonsonhoContactSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_opened'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_closed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_tamper_true'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_battery_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_left_open'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_contact_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('contact_sensor_zigbee_hybrid_contact_sensor_tamper_alarm'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('contact_sensor_zigbee_hybrid_contact_sensor_is_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_contact') === true;
        });
      }
    } catch (err) { this.error(`Condition contact_sensor_zigbee_hybrid_contact_sensor_is_open: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('contact_sensor_zigbee_hybrid_contact_sensor_battery_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
      });
      }
    } catch (err) { this.error(`Condition contact_sensor_zigbee_hybrid_contact_sensor_battery_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('contact_sensor_zigbee_hybrid_contact_sensor_contact_open');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition contact_sensor_zigbee_hybrid_contact_sensor_contact_open: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('contact_sensor_zigbee_hybrid_contact_sensor_tamper_active');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition contact_sensor_zigbee_hybrid_contact_sensor_tamper_active: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = LonsonhoContactSensorDriver;
