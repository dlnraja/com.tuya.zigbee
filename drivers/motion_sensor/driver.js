'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MotionSensorDriver initialized');

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
    this.log('[FLOW] ✅ Smart lux trigger registered');

    this.log('[FLOW] All flow cards registered');
  }
}

module.exports = MotionSensorDriver;
