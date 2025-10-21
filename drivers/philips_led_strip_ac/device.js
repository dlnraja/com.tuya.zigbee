'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PhilipsLedStripAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = PhilipsLedStripAcDevice;
