'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSwitch2buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSwitch2buttonDriver initialized');
  }
}

module.exports = ZemismartWirelessSwitch2buttonDriver;
