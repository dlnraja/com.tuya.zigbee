'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SamsungWaterLeakSensorCr2032Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SamsungWaterLeakSensorCr2032Device;
