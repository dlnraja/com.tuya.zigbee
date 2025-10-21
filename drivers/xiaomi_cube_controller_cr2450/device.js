'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiCubeControllerCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiCubeControllerCr2450Device;
