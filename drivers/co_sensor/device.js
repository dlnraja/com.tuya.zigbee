'use strict';

const { AutoAdaptiveDevice } = require('../../lib/dynamic');

class CoSensorDevice extends AutoAdaptiveDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('CO Sensor initialized');
  }
}

module.exports = CoSensorDevice;
