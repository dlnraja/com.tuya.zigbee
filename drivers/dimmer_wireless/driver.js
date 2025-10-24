'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DimmerWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('DimmerWirelessDriver initialized');
  }
}

module.exports = DimmerWirelessDriver;
