'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungOutletAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungOutletAcDevice;
