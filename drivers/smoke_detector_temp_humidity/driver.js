'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmokeDetectorTempHumidityAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmokeDetectorTempHumidityAdvancedDriver initialized');
  }
}

module.exports = SmokeDetectorTempHumidityAdvancedDriver;
