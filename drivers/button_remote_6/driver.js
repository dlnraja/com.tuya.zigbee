'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSwitch6buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSwitch6buttonDriver initialized');
  }
}

module.exports = ZemismartWirelessSwitch6buttonDriver;
