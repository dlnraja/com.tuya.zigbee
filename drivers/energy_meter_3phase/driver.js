'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class EnergyMeter3phaseDriver extends ZigBeeDriver {

  async onInit() {
    this.log('EnergyMeter3phaseDriver initialized');
  }

}

module.exports = EnergyMeter3phaseDriver;
