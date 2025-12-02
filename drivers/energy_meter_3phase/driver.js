'use strict';

const Homey = require('homey');

class EnergyMeter3phaseDriver extends Homey.Driver {
  async onInit() {
    this.log('Energy Meter 3-Phase Driver initialized');
  }
}

module.exports = EnergyMeter3phaseDriver;
