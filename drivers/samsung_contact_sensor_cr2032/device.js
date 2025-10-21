'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungContactSensorCr2032Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungContactSensorCr2032Device;
