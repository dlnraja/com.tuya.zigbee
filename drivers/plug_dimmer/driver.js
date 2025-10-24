'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartPlugDimmerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartPlugDimmerDriver initialized');
  }
}

module.exports = SmartPlugDimmerDriver;
