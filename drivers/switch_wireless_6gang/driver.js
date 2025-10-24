'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch6gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch6gangDriver initialized');
  }
}

module.exports = WirelessSwitch6gangDriver;
