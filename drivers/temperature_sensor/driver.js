'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartTemperatureSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartTemperatureSensorDriver initialized');
  }
}

module.exports = ZemismartTemperatureSensorDriver;
