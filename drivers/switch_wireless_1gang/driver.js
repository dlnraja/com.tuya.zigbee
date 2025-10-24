'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSwitch1gangDriver initialized');
  }
}

module.exports = ZemismartWirelessSwitch1gangDriver;
