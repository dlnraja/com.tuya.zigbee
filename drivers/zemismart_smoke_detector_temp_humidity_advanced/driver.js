'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSmokeDetectorTempHumidityAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSmokeDetectorTempHumidityAdvancedDriver initialized');
  }
}

module.exports = ZemismartSmokeDetectorTempHumidityAdvancedDriver;
