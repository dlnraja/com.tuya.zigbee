'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.530: COMPLETE FLOW CARDS with device validation
 * Fixes "Cannot get device by id" error
 */
class MotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    await super.onInit();
    this.log('MotionSensorDriver v5.5.530 initializing...');

    try {
      // ═══════════════════════════════════════════════════════════════
      // TRIGGER CARDS - All triggers from driver.flow.compose.json
      // ═══════════════════════════════════════════════════════════════
      this.motionDetectedTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_motion_detected');
      this.motionClearedTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_motion_cleared');
      this.batteryLowTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_battery_low');
      this.batteryChangedTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_battery_changed');
      this.luxChangedTrigger = this.homey.flow.getDeviceTriggerCard('motion_sensor_lux_changed');

      // ═══════════════════════════════════════════════════════════════
      // CONDITION CARDS - with device validation
      // ═══════════════════════════════════════════════════════════════
      this.motionActiveCondition = this.homey.flow.getConditionCard('motion_sensor_motion_active');
      this.motionActiveCondition?.registerRunListener(async (args) => {
        if (!args.device) throw new Error('Device not found');
        return args.device.getCapabilityValue('alarm_motion') === true;
      });

      this.log('MotionSensorDriver v5.5.530 ✅ All flow cards registered');
    } catch (err) {
      this.error('MotionSensorDriver flow card registration failed:', err.message);
    }
  }
}

module.exports = MotionSensorDriver;
