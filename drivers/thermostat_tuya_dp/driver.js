'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ThermostatTuyaDpDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ThermostatTuyaDpDriver initialized');

    // Register flow triggers
    this._thermostat_target_changedTrigger = this.homey.flow.getDeviceTriggerCard('thermostat_target_changed');
    this._thermostat_mode_changedTrigger = this.homey.flow.getDeviceTriggerCard('thermostat_mode_changed');
    this._thermostat_heating_startedTrigger = this.homey.flow.getDeviceTriggerCard('thermostat_heating_started');
    this._thermostat_heating_stoppedTrigger = this.homey.flow.getDeviceTriggerCard('thermostat_heating_stopped');

    // Register flow conditions
    this._thermostat_is_heatingCondition = this.homey.flow.getDeviceConditionCard('thermostat_is_heating');
    this._thermostat_target_isCondition = this.homey.flow.getDeviceConditionCard('thermostat_target_is');

    // Register flow actions
    this._thermostat_set_presetAction = this.homey.flow.getDeviceActionCard('thermostat_set_preset');
    this._thermostat_set_presetAction?.registerRunListener(async (args) => {
      const { device, preset } = args;
      await device._sendTuyaDP(2, { 'heat': 0, 'auto': 1, 'off': 2 }[preset] ?? 0, 'enum');
      return true;
    });

    // NEW: Set temperature offset action (forum request)
    this._set_temperature_offsetAction = this.homey.flow.getDeviceActionCard('set_temperature_offset');
    this._set_temperature_offsetAction?.registerRunListener(async (args) => {
      const { device, offset } = args;
      await device._sendTuyaDP(104, Math.round(offset * 10), 'value');
      this.log(`[THERMOSTAT] Temperature offset set to ${offset}°C`);
      return true;
    });

    this.log('thermostat_tuya_dp: Flow cards registered');
  }
}

module.exports = ThermostatTuyaDpDriver;
