'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PresenceSensorRadarDriver extends ZigBeeDriver {
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
    if (this._flowCardsRegistered) {return;}
    this._flowCardsRegistered = true;
    this.log('PresenceSensorRadarDriver v5.5.580 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // TRIGGERS
    const _triggerIds = ["sensor_climate_presence_sensor_presence_rada_34c19","sensor_climate_presence_sensor_presence_rada_05404","sensor_climate_presence_sensor_radar_motion__34acb","sensor_climate_presence_sensor_radar_illumin_42661","sensor_climate_presence_sensor_radar_distanc_f862e","sensor_climate_presence_sensor_radar_lux_cha_ca462","sensor_climate_presence_sensor_radar_battery_3de7e"];
    for (const _tid of _triggerIds) {
      try {
        const _card = this._getFlowCard(_tid, "trigger");
        if (_card) {
          _card.registerRunListener(async (args) => {
            if (!args.device) {return;}
            args.device.emit(`flow:${  _tid}`, args);
          });
        }
      } catch (_err) { this.error(`Trigger ${  _tid  }: ${  _err.message}`); }
    }
    // END TRIGGERS
    // CONDITIONS
    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_sensor_radar_is_pres_9002d');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_climate_presence_sensor_radar_is_pres_9002d: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_sensor_radar_illumin_bd363');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_climate_presence_sensor_radar_illumin_bd363: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_sensor_radar_distanc_c82b4');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_climate_presence_sensor_radar_distanc_c82b4: ${err.message}`); } }

    try {
      const card = this.homey.flow.getConditionCard('sensor_climate_presence_sensor_radar_motion__853f1');
      if (card) {
        card.registerRunListener(async (args) => {
          if (!args.device) {return false;}
          return args.device.getCapabilityValue('alarm_motion') === true;
        });
      }
    } catch (err) { if (this.developerDebugMode) { this.error(`Condition sensor_climate_presence_sensor_radar_motion__853f1: ${err.message}`); } }

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = PresenceSensorRadarDriver;
