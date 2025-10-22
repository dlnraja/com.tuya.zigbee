'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscDimmerWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscDimmerWirelessDriver initialized');
  }
}

module.exports = LscDimmerWirelessDriver;
