'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch6buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch6buttonDriver initialized');
  }
}

module.exports = WirelessSwitch6buttonDriver;
