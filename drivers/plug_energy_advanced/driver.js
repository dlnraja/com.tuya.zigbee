'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class EnergyPlugAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('EnergyPlugAdvancedDriver initialized');
  }
}

module.exports = EnergyPlugAdvancedDriver;
