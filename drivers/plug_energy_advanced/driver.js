'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoEnergyPlugAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoEnergyPlugAdvancedDriver initialized');
  }
}

module.exports = AvattoEnergyPlugAdvancedDriver;
