'use strict';

const { Driver } = require('homey');

class IlluminanceSensorDriver extends Driver {
  async onInit() {
    this.log('Illuminance Sensor driver initialized');
  }
}

module.exports = IlluminanceSensorDriver;
