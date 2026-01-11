'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.475: FIXED - Moved orphaned flow card code inside onInit()
 */
class Dimmer1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Dimmer1gangDriver v5.5.475 initialized');

    // Register flow triggers
    this._dimmer_turned_onTrigger = this.homey.flow.getDeviceTriggerCard('dimmer_turned_on');
    this._dimmer_turned_offTrigger = this.homey.flow.getDeviceTriggerCard('dimmer_turned_off');
    this._dimmer_level_changedTrigger = this.homey.flow.getDeviceTriggerCard('dimmer_level_changed');

    // Register flow conditions
    this._dimmer_is_onCondition = this.homey.flow.getDeviceConditionCard('dimmer_is_on');
    this._dimmer_is_onCondition?.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('onoff') === true;
    });
    this._dimmer_level_isCondition = this.homey.flow.getDeviceConditionCard('dimmer_level_is');
    this._dimmer_level_isCondition?.registerRunListener(async (args) => {
      const { device, threshold } = args;
      const value = device.getCapabilityValue('dim') || 0;
      return value >= threshold;
    });

    // Register flow actions
    this._dimmer_set_levelAction = this.homey.flow.getDeviceActionCard('dimmer_set_level');
    this._dimmer_set_levelAction?.registerRunListener(async (args) => {
      const { device, level } = args;
      await device.setCapabilityValue('dim', level / 100);
      return true;
    });
    this._dimmer_fade_toAction = this.homey.flow.getDeviceActionCard('dimmer_fade_to');
    this._dimmer_fade_toAction?.registerRunListener(async (args) => {
      const { device, level, duration } = args;
      await device.setCapabilityValue('dim', level / 100);
      return true;
    });

    this.log('dimmer_wall_1gang: Flow cards registered');
  }
}

module.exports = Dimmer1gangDriver;
