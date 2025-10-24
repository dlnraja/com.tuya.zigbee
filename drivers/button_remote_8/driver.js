'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch8buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch8buttonDriver initialized');
  }
}

module.exports = WirelessSwitch8buttonDriver;
