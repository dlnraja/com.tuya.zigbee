'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

/**
 * v5.5.570: CRITICAL FIX - Flow card run listeners were missing
 */
class VibrationSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('VibrationSensorDriver v5.5.570 initialized');
    this._registerFlowCards();
  }

  _registerFlowCards() {
    // CONDITION: Vibration is/is not detected
    try {
      this.homey.flow.getConditionCard('vibration_sensor_is_vibrating')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          return args.device.getCapabilityValue('alarm_vibration') === true;
        });
      this.log('[FLOW] ✅ vibration_sensor_is_vibrating');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    // CONDITION: Battery above threshold
    try {
      this.homey.flow.getConditionCard('vibration_sensor_battery_above')
        .registerRunListener(async (args) => {
          if (!args.device) return false;
          const battery = args.device.getCapabilityValue('measure_battery') || 0;
          return battery > (args.threshold || 20);
        });
      this.log('[FLOW] ✅ vibration_sensor_battery_above');
    } catch (err) { this.log(`[FLOW] ⚠️ ${err.message}`); }

    this.log('[FLOW] 🎉 Vibration sensor flow cards registered');
  }
}

module.exports = VibrationSensorDriver;
