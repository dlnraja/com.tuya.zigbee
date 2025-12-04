'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

/**
 * VibrationSensorDevice - v5.3.58 AUTO-ADAPTIVE VERSION
 *
 * NOW USES AutoAdaptiveDevice for guaranteed data reception!
 *
 * v5.3.58: Switched to AutoAdaptiveDevice for multi-path DP listening
 */
class VibrationSensorDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Vibration Sensor initialized (AUTO-ADAPTIVE)');
  }
}

module.exports = VibrationSensorDevice;
