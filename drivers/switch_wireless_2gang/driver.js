'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch2gangDriver initialized');
  }
}

module.exports = WirelessSwitch2gangDriver;
