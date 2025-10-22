'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartPirRadarIlluminationSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartPirRadarIlluminationSensorDriver initialized');
  }
}

module.exports = ZemismartPirRadarIlluminationSensorDriver;
