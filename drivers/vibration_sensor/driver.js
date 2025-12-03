'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class VibrationSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('VibrationSensorDriver initialized');
  }

}

module.exports = VibrationSensorDriver;
