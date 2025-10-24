'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoPlugEnergyMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoPlugEnergyMonitorDriver initialized');
  }
}

module.exports = AvattoPlugEnergyMonitorDriver;
