'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PirSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PirSensorAdvancedDriver initialized');
  }
}

module.exports = PirSensorAdvancedDriver;
