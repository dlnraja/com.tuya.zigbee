'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch1gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch1gangDriver initialized');
  }
}

module.exports = WirelessSwitch1gangDriver;
