'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WaterLeakSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WaterLeakSensorDriver initialized');
  }
}

module.exports = WaterLeakSensorDriver;
