'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartHumidityControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartHumidityControllerDriver initialized');
  }
}

module.exports = ZemismartHumidityControllerDriver;
