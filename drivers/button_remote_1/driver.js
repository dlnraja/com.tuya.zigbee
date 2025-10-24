'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSwitch1buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSwitch1buttonDriver initialized');
  }
}

module.exports = ZemismartWirelessSwitch1buttonDriver;
