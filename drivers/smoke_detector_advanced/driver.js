'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * SmartSmokeDetectorAdvancedDriver - v5.5.454
 * FIX: Removed orphaned code after module.exports that caused syntax error
 */
class SmartSmokeDetectorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartSmokeDetectorAdvancedDriver v5.5.454 initialized');

    // Register flow triggers
    this._smoke_alarm_triggeredTrigger = this.homey.flow.getDeviceTriggerCard('smoke_alarm_triggered');
    this._smoke_alarm_clearedTrigger = this.homey.flow.getDeviceTriggerCard('smoke_alarm_cleared');
    this._smoke_tamper_alarmTrigger = this.homey.flow.getDeviceTriggerCard('smoke_tamper_alarm');
    this._smoke_battery_lowTrigger = this.homey.flow.getDeviceTriggerCard('smoke_battery_low');

    // Register flow conditions
    this._smoke_alarm_is_activeCondition = this.homey.flow.getDeviceConditionCard('smoke_alarm_is_active');
    this._smoke_alarm_is_activeCondition.registerRunListener(async (args) => {
      const { device } = args;
      return device.getCapabilityValue('alarm_smoke') === true;
    });

    // Register flow actions
    this._smoke_test_alarmAction = this.homey.flow.getDeviceActionCard('smoke_test_alarm');
    this._smoke_test_alarmAction.registerRunListener(async (args) => {
      const { device } = args;
      this.log('[SMOKE] Test alarm triggered via Flow');
      // Simulate alarm for testing flows
      await device.setCapabilityValue('alarm_smoke', true).catch(() => { });
      setTimeout(async () => {
        await device.setCapabilityValue('alarm_smoke', false).catch(() => { });
      }, 5000);
      return true;
    });

    this._smoke_silence_alarmAction = this.homey.flow.getDeviceActionCard('smoke_silence_alarm');
    this._smoke_silence_alarmAction.registerRunListener(async (args) => {
      const { device } = args;
      this.log('[SMOKE] Silence alarm triggered via Flow');
      await device.setCapabilityValue('alarm_smoke', false).catch(() => { });
      return true;
    });

    this.log('[SMOKE] ✅ Flow cards registered');
  }
}

module.exports = SmartSmokeDetectorAdvancedDriver;
