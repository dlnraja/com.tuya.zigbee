'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MotionSensorDriver initialized');
    this._motion_illuminance_isCondition = this.homey.flow.getDeviceConditionCard('motion_illuminance_is');
    this._motion_illuminance_isCondition.registerRunListener(async (args) => {
      const { device } = args;
      const { threshold } = args;
      const value = device.getCapabilityValue('measure_luminance') || 0;
      return value >= threshold;
    });

    // Register flow condition: motion_sensor_motion_active
    this.homey.flow.getConditionCard('motion_sensor_motion_active')
      .registerRunListener(async (args, state) => {
        const { device } = args;
        const motionActive = device.getCapabilityValue('alarm_motion');
        this.log(`[FLOW] Condition check: alarm_motion = ${motionActive}`);
        return motionActive === true;
      });

    // v5.5.355: Register smart lux trigger for independent luminance reporting
    this.luxChangedTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_lux_changed');
    this._motion_illuminance_changedTrigger = this.homey.flow.getDeviceTriggerCard('motion_illuminance_changed');
    this._motion_illuminance_aboveTrigger = this.homey.flow.getDeviceTriggerCard('motion_illuminance_above');
    this._motion_illuminance_belowTrigger = this.homey.flow.getDeviceTriggerCard('motion_illuminance_below');
    this._motion_battery_lowTrigger = this.homey.flow.getDeviceTriggerCard('motion_battery_low');
    this.log('[FLOW] ✅ Smart lux trigger registered');

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = MotionSensorDriver;
