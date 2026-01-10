'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadiatorControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadiatorControllerDriver initialized');

    // Register flow triggers
    this._controller_target_changedTrigger = this.homey.flow.getDeviceTriggerCard('controller_target_changed');
    this._controller_heating_startedTrigger = this.homey.flow.getDeviceTriggerCard('controller_heating_started');
    this._controller_heating_stoppedTrigger = this.homey.flow.getDeviceTriggerCard('controller_heating_stopped');

    // Register flow conditions
    this._controller_is_heatingCondition = this.homey.flow.getDeviceConditionCard('controller_is_heating');

    // Register flow actions - set_temperature_offset (forum request)
    this._set_temperature_offsetAction = this.homey.flow.getDeviceActionCard('set_temperature_offset');
    this._set_temperature_offsetAction?.registerRunListener(async (args) => {
      const { device, offset } = args;
      // DP 104 = temp_offset, multiplied by 10
      await device._sendTuyaDP(104, Math.round(offset * 10), 'value');
      this.log(`[RADIATOR_CTRL] Temperature offset set to ${offset}°C`);
      return true;
    });

    this.log('radiator_controller: Flow cards registered');
  }
}

module.exports = RadiatorControllerDriver;
