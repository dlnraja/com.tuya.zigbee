'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungSmartPlugAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungSmartPlugAcDevice;
