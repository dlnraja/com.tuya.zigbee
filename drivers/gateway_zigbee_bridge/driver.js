'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class NousZbbridgeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('NousZbbridgeDriver initialized');
  }
}

module.exports = NousZbbridgeDriver;
