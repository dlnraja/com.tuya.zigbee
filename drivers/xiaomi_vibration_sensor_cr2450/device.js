'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiVibrationSensorCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiVibrationSensorCr2450Device;
