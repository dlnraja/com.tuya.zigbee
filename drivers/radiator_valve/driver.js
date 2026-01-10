'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadiatorValveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadiatorValveDriver initialized');

    // Register flow triggers
    this._valve_target_changedTrigger = this.homey.flow.getDeviceTriggerCard('valve_target_changed');
    this._valve_heating_startedTrigger = this.homey.flow.getDeviceTriggerCard('valve_heating_started');
    this._valve_heating_stoppedTrigger = this.homey.flow.getDeviceTriggerCard('valve_heating_stopped');
    this._valve_battery_lowTrigger = this.homey.flow.getDeviceTriggerCard('valve_battery_low');
    this._valve_window_openTrigger = this.homey.flow.getDeviceTriggerCard('valve_window_open');

    // Register flow conditions
    this._valve_is_heatingCondition = this.homey.flow.getDeviceConditionCard('valve_is_heating');
    this._valve_target_isCondition = this.homey.flow.getDeviceConditionCard('valve_target_is');

    // Register flow actions
    this._valve_set_presetAction = this.homey.flow.getDeviceActionCard('valve_set_preset');
    this._valve_set_presetAction?.registerRunListener(async (args) => {
      const { device, preset } = args;
      await device._sendTuyaDP(2, { 'heat': 0, 'auto': 1, 'off': 2 }[preset] ?? 0, 'enum');
      return true;
    });

    this._valve_set_child_lockAction = this.homey.flow.getDeviceActionCard('valve_set_child_lock');
    this._valve_set_child_lockAction?.registerRunListener(async (args) => {
      const { device, locked } = args;
      await device._sendTuyaDP(7, locked, 'bool');
      return true;
    });

    // NEW: Set temperature offset action (forum request)
    this._set_temperature_offsetAction = this.homey.flow.getDeviceActionCard('set_temperature_offset');
    this._set_temperature_offsetAction?.registerRunListener(async (args) => {
      const { device, offset } = args;
      // DP 104 = temp_offset, multiplied by 10
      await device._sendTuyaDP(104, Math.round(offset * 10), 'value');
      this.log(`[TRV] Temperature offset set to ${offset}°C`);
      return true;
    });

    this.log('radiator_valve: Flow cards registered');
  }
}

module.exports = RadiatorValveDriver;
