'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PhilipsSmartPlugAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = PhilipsSmartPlugAcDevice;
