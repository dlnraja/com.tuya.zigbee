'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class InnrSmartPlugAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = InnrSmartPlugAcDevice;
