'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class XiaomiTemperatureHumidityCr2032Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = XiaomiTemperatureHumidityCr2032Device;
