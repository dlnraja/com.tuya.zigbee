'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PhilipsDimmerSwitchAaaDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = PhilipsDimmerSwitchAaaDevice;
