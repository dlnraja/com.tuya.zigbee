'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class OsramLedStripRgbwAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = OsramLedStripRgbwAcDevice;
