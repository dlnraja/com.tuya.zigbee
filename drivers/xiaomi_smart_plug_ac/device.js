'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiSmartPlugAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiSmartPlugAcDevice;
