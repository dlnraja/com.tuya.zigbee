'use strict';

const Homey = require('homey');

class VibrationSensorDriver extends Homey.Driver {
  async onInit() {
    this.log('Vibration Sensor Driver initialized');
  }
}

module.exports = VibrationSensorDriver;
