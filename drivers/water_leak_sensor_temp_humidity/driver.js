'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TempHumidSensorLeakDetectorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TempHumidSensorLeakDetectorDriver initialized');
  }
}

module.exports = TempHumidSensorLeakDetectorDriver;
