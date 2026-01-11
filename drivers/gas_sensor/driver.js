'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.475: FIXED - Moved orphaned flow card code inside onInit()
 */
class TuyaGasSensorTs0601Driver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaGasSensorTs0601Driver v5.5.475 initialized');

    // Register flow triggers
    this._gas_alarm_triggeredTrigger = this.homey.flow.getDeviceTriggerCard('gas_alarm_triggered');
    this._gas_alarm_clearedTrigger = this.homey.flow.getDeviceTriggerCard('gas_alarm_cleared');
    this._gas_level_changedTrigger = this.homey.flow.getDeviceTriggerCard('gas_level_changed');

    // Register flow conditions
    this._gas_alarm_is_activeCondition = this.homey.flow.getDeviceConditionCard('gas_alarm_is_active');

    // Register flow actions
    this._gas_test_alarmAction = this.homey.flow.getDeviceActionCard('gas_test_alarm');
    this._gas_test_alarmAction?.registerRunListener(async (args) => {
      const { device } = args;
      await device.setCapabilityValue('alarm_gas', true);
      return true;
    });
    this._gas_silence_alarmAction = this.homey.flow.getDeviceActionCard('gas_silence_alarm');
    this._gas_silence_alarmAction?.registerRunListener(async (args) => {
      const { device } = args;
      await device.setCapabilityValue('alarm_gas', false);
      return true;
    });

    this.log('gas_sensor: Flow cards registered');
  }
}

module.exports = TuyaGasSensorTs0601Driver;
