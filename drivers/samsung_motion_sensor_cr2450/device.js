'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungMotionSensorCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungMotionSensorCr2450Device;
