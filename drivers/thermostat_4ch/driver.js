'use strict';

const Homey = require('homey');

class Thermostat4chDriver extends Homey.Driver {
  async onInit() {
    this.log('Thermostat 4-Channel Driver initialized');
  }
}

module.exports = Thermostat4chDriver;
