'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiButtonWirelessCr2032Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiButtonWirelessCr2032Device;
