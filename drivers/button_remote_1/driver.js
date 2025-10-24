'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch1buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch1buttonDriver initialized');
  }
}

module.exports = WirelessSwitch1buttonDriver;
