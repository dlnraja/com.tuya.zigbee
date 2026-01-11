'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.476: FIXED - Use only existing flow card IDs from driver.flow.compose.json
 */
class MotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MotionSensorDriver v5.5.476 initialized');

    // Register condition card (must match ID in driver.flow.compose.json)
    try {
      this._motionActiveCondition = this.homey.flow.getDeviceConditionCard('motion_sensor_motion_active');
      this._motionActiveCondition?.registerRunListener(async (args) => {
        const { device } = args;
        return device.getCapabilityValue('alarm_motion') === true;
      });
    } catch (e) {
      this.log('[FLOW] Condition card not available:', e.message);
    }

    // Trigger card for lux changes (defined in driver.flow.compose.json)
    this.luxChangedTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_lux_changed');

    this.log('[FLOW] Flow cards registered');
  }
}

module.exports = MotionSensorDriver;
