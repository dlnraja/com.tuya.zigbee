'use strict';

const Homey = require('homey');

class SwitchTempSensorDriver extends Homey.Driver {
  async onInit() {
    this.log('Switch with Temperature Sensor Driver initialized');
  }
}

module.exports = SwitchTempSensorDriver;
