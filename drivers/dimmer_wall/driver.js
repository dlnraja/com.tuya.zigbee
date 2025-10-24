'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DimmerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('DimmerDriver initialized');
  }
}

module.exports = DimmerDriver;
