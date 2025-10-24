'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class EnergyMonitoringPlugAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('EnergyMonitoringPlugAdvancedDriver initialized');
  }
}

module.exports = EnergyMonitoringPlugAdvancedDriver;
