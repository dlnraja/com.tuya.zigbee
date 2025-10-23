'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSmartSmokeDetectorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSmartSmokeDetectorAdvancedDriver initialized');
  }
}

module.exports = ZemismartSmartSmokeDetectorAdvancedDriver;
