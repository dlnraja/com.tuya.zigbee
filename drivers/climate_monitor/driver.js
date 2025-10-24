'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TemperatureHumidityDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TemperatureHumidityDriver initialized');
  }
}

module.exports = TemperatureHumidityDriver;
