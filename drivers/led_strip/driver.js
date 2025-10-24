'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscPhilipsLedStripDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscPhilipsLedStripDriver initialized');
  }
}

module.exports = LscPhilipsLedStripDriver;
