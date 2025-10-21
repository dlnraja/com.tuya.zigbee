'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PhilipsMotionSensorAaaDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = PhilipsMotionSensorAaaDevice;
