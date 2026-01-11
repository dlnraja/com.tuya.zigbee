'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.475: FIXED - Moved orphaned flow card code inside onInit()
 */
class MotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MotionSensorDriver v5.5.475 initialized');

    // Register flow conditions
    this._motion_illuminance_isCondition = this.homey.flow.getDeviceConditionCard('motion_illuminance_is');
    this._motion_illuminance_isCondition?.registerRunListener(async (args) => {
      const { device, threshold } = args;
      const value = device.getCapabilityValue('measure_luminance') || 0;
      return value >= threshold;
    });

    this._motion_sensor_motion_activeCondition = this.homey.flow.getConditionCard('motion_sensor_motion_active');
    this._motion_sensor_motion_activeCondition?.registerRunListener(async (args) => {
      const { device } = args;
      const motionActive = device.getCapabilityValue('alarm_motion');
      this.log(`[FLOW] Condition check: alarm_motion = ${motionActive}`);
      return motionActive === true;
    });

    // Register flow triggers
    this.luxChangedTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_lux_changed');
    this._motion_illuminance_changedTrigger = this.homey.flow.getDeviceTriggerCard('motion_illuminance_changed');
    this._motion_illuminance_aboveTrigger = this.homey.flow.getDeviceTriggerCard('motion_illuminance_above');
    this._motion_illuminance_belowTrigger = this.homey.flow.getDeviceTriggerCard('motion_illuminance_below');
    this._motion_battery_lowTrigger = this.homey.flow.getDeviceTriggerCard('motion_battery_low');

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = MotionSensorDriver;
