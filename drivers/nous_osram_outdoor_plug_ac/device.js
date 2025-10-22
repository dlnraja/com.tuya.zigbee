'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class OsramOutdoorPlugAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = OsramOutdoorPlugAcDevice;
