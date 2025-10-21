'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiWaterLeakCr2032Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiWaterLeakCr2032Device;
