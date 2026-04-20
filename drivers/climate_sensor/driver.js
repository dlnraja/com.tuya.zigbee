'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateSensorDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
    this.log('ClimateSensorDriver initialized');
  }
}

module.exports = ClimateSensorDriver;
