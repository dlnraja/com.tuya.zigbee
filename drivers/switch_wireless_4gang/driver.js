'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch4gangDriver initialized');
  }
}

module.exports = WirelessSwitch4gangDriver;
