'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartGasDetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartGasDetectorDriver initialized');
  }
}

module.exports = ZemismartGasDetectorDriver;
