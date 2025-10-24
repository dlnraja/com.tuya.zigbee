'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TemperatureSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TemperatureSensorDriver initialized');
  }
}

module.exports = TemperatureSensorDriver;
