'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PirRadarIlluminationSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PirRadarIlluminationSensorDriver initialized');
  }
}

module.exports = PirRadarIlluminationSensorDriver;
