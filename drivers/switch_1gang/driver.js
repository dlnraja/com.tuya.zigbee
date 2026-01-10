'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {

  onInit() {
    this.log('Tuya Zigbee Driver has been initialized');
    super.onInit();
  }

}

module.exports = TuyaZigbeeDriver;
    
    // Register flow triggers
    this._switch_turned_onTrigger = this.homey.flow.getDeviceTriggerCard('switch_turned_on');
    this._switch_turned_offTrigger = this.homey.flow.getDeviceTriggerCard('switch_turned_off');
    this._switch_power_changedTrigger = this.homey.flow.getDeviceTriggerCard('switch_power_changed');
    
    // Register flow conditions
    this._switch_is_onCondition = this.homey.flow.getDeviceConditionCard('switch_is_on');
    this._switch_is_onCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('onoff') === true;
    });
    
    this.log('switch_1gang: Flow cards registered');