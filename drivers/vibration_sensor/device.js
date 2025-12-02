'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class VibrationSensorDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Vibration Sensor initialized');
  }
}

module.exports = VibrationSensorDevice;
