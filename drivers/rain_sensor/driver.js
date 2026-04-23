'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RainSensorDriver extends ZigBeeDriver {
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
    this.log('RainSensorDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getTriggerCard('rain_sensor_rain_detected'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('rain_sensor_rain_stopped'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('rain_sensor_rain_intensity_changed'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('rain_sensor_battery_low'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('rain_sensor_water_alarm'); } catch (e) {}
    try { this.homey.flow.getTriggerCard('rain_sensor_humidity_changed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = const card = this.homey.flow.getConditionCard('rain_sensor_is_raining');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { this.error(`Condition rain_sensor_is_raining: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('rain_sensor_rain_intensity_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
      });
      }
    } catch (err) { this.error(`Condition rain_sensor_rain_intensity_above: ${err.message}`); }

    try {
      const card = const card = this.homey.flow.getConditionCard('rain_sensor_water_detected');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_gas') === true;
        });
      }
    } catch (err) { this.error(`Condition rain_sensor_water_detected: ${err.message}`); }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = RainSensorDriver;
