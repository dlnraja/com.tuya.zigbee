'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TemperatureSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TemperatureSensorAdvancedDriver initialized');
  }
}

module.exports = TemperatureSensorAdvancedDriver;
