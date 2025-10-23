'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MoesSonoffTemperatureHumidityDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MoesSonoffTemperatureHumidityDriver initialized');
  }
}

module.exports = MoesSonoffTemperatureHumidityDriver;
