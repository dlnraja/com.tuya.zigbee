'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartTemperatureSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartTemperatureSensorAdvancedDriver initialized');
  }
}

module.exports = ZemismartTemperatureSensorAdvancedDriver;
