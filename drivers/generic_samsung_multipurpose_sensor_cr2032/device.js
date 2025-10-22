'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungMultipurposeSensorCr2032Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungMultipurposeSensorCr2032Device;
