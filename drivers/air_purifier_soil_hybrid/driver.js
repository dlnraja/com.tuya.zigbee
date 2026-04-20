'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class SoilSensorDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
    this.log('SoilSensorDriver initialized');
  }
}

module.exports = SoilSensorDriver;
