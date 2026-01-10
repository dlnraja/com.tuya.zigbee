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
    this._switch2_gang1_onTrigger = this.homey.flow.getDeviceTriggerCard('switch2_gang1_on');
    this._switch2_gang1_offTrigger = this.homey.flow.getDeviceTriggerCard('switch2_gang1_off');
    this._switch2_gang2_onTrigger = this.homey.flow.getDeviceTriggerCard('switch2_gang2_on');
    this._switch2_gang2_offTrigger = this.homey.flow.getDeviceTriggerCard('switch2_gang2_off');
    this._switch2_power_changedTrigger = this.homey.flow.getDeviceTriggerCard('switch2_power_changed');
    
    // Register flow conditions
    this._switch2_gang1_is_onCondition = this.homey.flow.getDeviceConditionCard('switch2_gang1_is_on');
    this._switch2_gang1_is_onCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('onoff') === true;
    });
    this._switch2_gang2_is_onCondition = this.homey.flow.getDeviceConditionCard('switch2_gang2_is_on');
    this._switch2_gang2_is_onCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('onoff') === true;
    });
    
    // Register flow actions
    this._switch2_set_gang1Action = this.homey.flow.getDeviceActionCard('switch2_set_gang1');
    this._switch2_set_gang1Action.registerRunListener(async (args) => {
      const { device } = args;
      // TODO: Implement action logic
      return true;
    });
    this._switch2_set_gang2Action = this.homey.flow.getDeviceActionCard('switch2_set_gang2');
    this._switch2_set_gang2Action.registerRunListener(async (args) => {
      const { device } = args;
      // TODO: Implement action logic
      return true;
    });
    this._switch2_toggle_allAction = this.homey.flow.getDeviceActionCard('switch2_toggle_all');
    this._switch2_toggle_allAction.registerRunListener(async (args) => {
      const { device } = args;
      // TODO: Implement action logic
      return true;
    });
    
    this.log('switch_2gang: Flow cards registered');