'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DimmerDualChannelDriver extends ZigBeeDriver {

  async onInit() {
    this.log('DimmerDualChannelDriver initialized');
  }
}

module.exports = DimmerDualChannelDriver;
