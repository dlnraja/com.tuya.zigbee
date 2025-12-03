'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ClimateSensorDriver initialized');
  }
}

module.exports = ClimateSensorDriver;
