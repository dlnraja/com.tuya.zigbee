'use strict';

const BaseHybridDevice = require('../../lib/devices/BaseHybridDevice');

class CoSensorDevice extends BaseHybridDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('CO Sensor initialized');
  }
}

module.exports = CoSensorDevice;
