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
    this._switch3_gang1_onTrigger = this.homey.flow.getDeviceTriggerCard('switch3_gang1_on');
    this._switch3_gang1_offTrigger = this.homey.flow.getDeviceTriggerCard('switch3_gang1_off');
    this._switch3_gang2_onTrigger = this.homey.flow.getDeviceTriggerCard('switch3_gang2_on');
    this._switch3_gang2_offTrigger = this.homey.flow.getDeviceTriggerCard('switch3_gang2_off');
    this._switch3_gang3_onTrigger = this.homey.flow.getDeviceTriggerCard('switch3_gang3_on');
    this._switch3_gang3_offTrigger = this.homey.flow.getDeviceTriggerCard('switch3_gang3_off');
    
    // Register flow conditions
    this._switch3_gang1_is_onCondition = this.homey.flow.getDeviceConditionCard('switch3_gang1_is_on');
    this._switch3_gang1_is_onCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('onoff') === true;
    });
    this._switch3_gang2_is_onCondition = this.homey.flow.getDeviceConditionCard('switch3_gang2_is_on');
    this._switch3_gang2_is_onCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('onoff') === true;
    });
    this._switch3_gang3_is_onCondition = this.homey.flow.getDeviceConditionCard('switch3_gang3_is_on');
    this._switch3_gang3_is_onCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('onoff') === true;
    });
    
    // Register flow actions
    this._switch3_set_gangAction = this.homey.flow.getDeviceActionCard('switch3_set_gang');
    this._switch3_set_gangAction.registerRunListener(async (args) => {
      const { device } = args;
      // TODO: Implement action logic
      return true;
    });
    this._switch3_toggle_allAction = this.homey.flow.getDeviceActionCard('switch3_toggle_all');
    this._switch3_toggle_allAction.registerRunListener(async (args) => {
      const { device } = args;
      // TODO: Implement action logic
      return true;
    });
    this._switch3_all_onAction = this.homey.flow.getDeviceActionCard('switch3_all_on');
    this._switch3_all_onAction.registerRunListener(async (args) => {
      const { device } = args;
      // TODO: Implement action logic
      return true;
    });
    this._switch3_all_offAction = this.homey.flow.getDeviceActionCard('switch3_all_off');
    this._switch3_all_offAction.registerRunListener(async (args) => {
      const { device } = args;
      // TODO: Implement action logic
      return true;
    });
    
    this.log('switch_3gang: Flow cards registered');