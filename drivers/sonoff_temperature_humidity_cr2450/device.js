'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class SonoffTemperatureHumidityCr2450Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.printNode();
  }
}

module.exports = SonoffTemperatureHumidityCr2450Device;
