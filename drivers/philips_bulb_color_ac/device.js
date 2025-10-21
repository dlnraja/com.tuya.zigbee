'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PhilipsBulbColorAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = PhilipsBulbColorAcDevice;
