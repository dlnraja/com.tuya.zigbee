'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch2buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch2buttonDriver initialized');
  }
}

module.exports = WirelessSwitch2buttonDriver;
