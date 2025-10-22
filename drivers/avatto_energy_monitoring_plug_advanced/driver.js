'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoEnergyMonitoringPlugAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoEnergyMonitoringPlugAdvancedDriver initialized');
  }
}

module.exports = AvattoEnergyMonitoringPlugAdvancedDriver;
