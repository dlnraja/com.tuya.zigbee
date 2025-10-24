'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartTempHumidSensorLeakDetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartTempHumidSensorLeakDetectorDriver initialized');
  }
}

module.exports = ZemismartTempHumidSensorLeakDetectorDriver;
