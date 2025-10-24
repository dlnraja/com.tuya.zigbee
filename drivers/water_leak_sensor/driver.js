'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartWaterLeakSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartWaterLeakSensorDriver initialized');
  }
}

module.exports = ZemismartWaterLeakSensorDriver;
