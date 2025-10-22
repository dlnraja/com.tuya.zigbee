'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSwitch3buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSwitch3buttonDriver initialized');
  }
}

module.exports = ZemismartWirelessSwitch3buttonDriver;
