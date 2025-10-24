'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch3buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch3buttonDriver initialized');
  }
}

module.exports = WirelessSwitch3buttonDriver;
