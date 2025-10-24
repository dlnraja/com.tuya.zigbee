'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GasDetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('GasDetectorDriver initialized');
  }
}

module.exports = GasDetectorDriver;
