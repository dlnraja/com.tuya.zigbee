'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffLedStripAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SonoffLedStripAcDevice;
