'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch4buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch4buttonDriver initialized');
  }
}

module.exports = WirelessSwitch4buttonDriver;
