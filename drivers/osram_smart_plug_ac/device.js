'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class OsramSmartPlugAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = OsramSmartPlugAcDevice;
