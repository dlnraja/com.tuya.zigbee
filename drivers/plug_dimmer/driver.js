'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class NousSmartPlugDimmerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('NousSmartPlugDimmerDriver initialized');
  }
}

module.exports = NousSmartPlugDimmerDriver;
