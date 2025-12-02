'use strict';

const Homey = require('homey');

class CoSensorDriver extends Homey.Driver {
  async onInit() {
    this.log('CO Sensor Driver initialized');
  }
}

module.exports = CoSensorDriver;
