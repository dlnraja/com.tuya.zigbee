'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffMotionSensorCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SonoffMotionSensorCr2450Device;
