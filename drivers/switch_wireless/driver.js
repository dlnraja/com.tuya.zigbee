'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitchDriver initialized');
  }
}

module.exports = WirelessSwitchDriver;
