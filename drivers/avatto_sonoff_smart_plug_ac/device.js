'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffSmartPlugAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SonoffSmartPlugAcDevice;
