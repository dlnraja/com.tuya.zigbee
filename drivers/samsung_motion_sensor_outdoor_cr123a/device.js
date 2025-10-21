'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungMotionSensorOutdoorCr123aDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungMotionSensorOutdoorCr123aDevice;
