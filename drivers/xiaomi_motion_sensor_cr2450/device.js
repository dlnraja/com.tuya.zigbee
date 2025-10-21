'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiMotionSensorCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiMotionSensorCr2450Device;
