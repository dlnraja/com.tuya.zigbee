'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSwitch4buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSwitch4buttonDriver initialized');
  }
}

module.exports = ZemismartWirelessSwitch4buttonDriver;
