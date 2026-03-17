'use strict';

const { Driver } = require('homey');

class EnergyMeter3phaseDriver extends Driver {
  async onInit() {
    this.log('3-Phase Energy Meter driver initialized');
  }
}

module.exports = EnergyMeter3phaseDriver;
