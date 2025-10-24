'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PlugEnergyMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PlugEnergyMonitorDriver initialized');
  }
}

module.exports = PlugEnergyMonitorDriver;
