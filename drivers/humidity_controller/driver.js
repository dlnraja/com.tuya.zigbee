'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class HumidityControllerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('HumidityControllerDriver initialized');
  }
}

module.exports = HumidityControllerDriver;
