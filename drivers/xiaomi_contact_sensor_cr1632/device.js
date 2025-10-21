'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiContactSensorCr1632Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiContactSensorCr1632Device;
