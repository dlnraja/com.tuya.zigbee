'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SamsungWaterLeakSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SamsungWaterLeakSensorDriver initialized');
  }
}

module.exports = SamsungWaterLeakSensorDriver;
