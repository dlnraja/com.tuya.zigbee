'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class PhilipsBulbWhiteAmbianceAcDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = PhilipsBulbWhiteAmbianceAcDevice;
