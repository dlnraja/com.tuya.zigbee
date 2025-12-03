'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SoilSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SoilSensorDriver initialized');
  }
}

module.exports = SoilSensorDriver;
