'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZbbridgeDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZbbridgeDriver initialized');
  }
}

module.exports = ZbbridgeDriver;
