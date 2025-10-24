'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartPirSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartPirSensorAdvancedDriver initialized');
  }
}

module.exports = ZemismartPirSensorAdvancedDriver;
