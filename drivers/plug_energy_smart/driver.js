'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartPlugEnergyDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartPlugEnergyDriver initialized');
  }
}

module.exports = SmartPlugEnergyDriver;
