'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PhilipsBulbWhiteAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = PhilipsBulbWhiteAcDevice;
