'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class DimmerTouchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('DimmerTouchDriver initialized');
  }
}

module.exports = DimmerTouchDriver;
