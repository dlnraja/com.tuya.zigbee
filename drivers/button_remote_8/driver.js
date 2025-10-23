'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWirelessSwitch8buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWirelessSwitch8buttonDriver initialized');
  }
}

module.exports = ZemismartWirelessSwitch8buttonDriver;
