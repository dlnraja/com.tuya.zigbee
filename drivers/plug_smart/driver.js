'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.475: FIXED - Moved orphaned flow card code inside onInit()
 */
class PlugSmartDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PlugSmartDriver v5.5.475 initialized');

    // Register flow triggers
    this._plug_power_changedTrigger = this.homey.flow.getDeviceTriggerCard('plug_power_changed');
    this._plug_power_aboveTrigger = this.homey.flow.getDeviceTriggerCard('plug_power_above');
    this._plug_standby_enteredTrigger = this.homey.flow.getDeviceTriggerCard('plug_standby_entered');
    this._plug_standby_exitedTrigger = this.homey.flow.getDeviceTriggerCard('plug_standby_exited');
    this._plug_overloadTrigger = this.homey.flow.getDeviceTriggerCard('plug_overload');

    // Register flow conditions
    this._plug_power_isCondition = this.homey.flow.getDeviceConditionCard('plug_power_is');
    this._plug_in_standbyCondition = this.homey.flow.getDeviceConditionCard('plug_in_standby');

    // Register flow actions
    this._plug_reset_meterAction = this.homey.flow.getDeviceActionCard('plug_reset_meter');
    this._plug_reset_meterAction?.registerRunListener(async (args) => {
      const { device } = args;
      await device.triggerCapabilityListener('meter_power.reset', true);
      return true;
    });

    this.log('plug_smart: Flow cards registered');
  }
}

module.exports = PlugSmartDriver;
