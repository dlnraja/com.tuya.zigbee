'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungButtonCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungButtonCr2450Device;
