'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class FormaldehydeSensorDriver extends ZigBeeDriver {
async onInit() {
    await super.onInit();
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('FormaldehydeSensorDriver v5.5.582 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    try { this.homey.flow.getDeviceTriggerCard('formaldehyde_sensor_formaldehyde_changed'); } catch (e) {}
    try { this.homey.flow.getDeviceTriggerCard('formaldehyde_sensor_voc_changed'); } catch (e) {}
    try { this.homey.flow.getDeviceTriggerCard('formaldehyde_sensor_air_quality_alert'); } catch (e) {}
    try { this.homey.flow.getDeviceTriggerCard('formaldehyde_sensor_battery_low'); } catch (e) {}
    try { this.homey.flow.getDeviceTriggerCard('formaldehyde_sensor_temp_changed'); } catch (e) {}
    try { this.homey.flow.getDeviceTriggerCard('formaldehyde_sensor_humidity_changed'); } catch (e) {}

    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('formaldehyde_sensor_formaldehyde_above');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          const val = args.device.getCapabilityValue('measure_co2') || 0;
          return val > (args.threshold || 400);
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition formaldehyde_sensor_formaldehyde_above: ${err.message}`); }; }

    try {
      const card = this.homey.flow.getConditionCard('formaldehyde_sensor_air_quality_good');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('onoff') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition formaldehyde_sensor_air_quality_good: ${err.message}`); }; }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = FormaldehydeSensorDriver;
