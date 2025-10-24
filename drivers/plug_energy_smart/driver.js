'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartPlugEnergyDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartPlugEnergyDriver initialized');
  }
}

module.exports = AvattoSmartPlugEnergyDriver;
