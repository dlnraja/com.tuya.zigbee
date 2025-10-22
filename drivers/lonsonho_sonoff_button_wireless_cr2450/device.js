'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffButtonWirelessCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SonoffButtonWirelessCr2450Device;
