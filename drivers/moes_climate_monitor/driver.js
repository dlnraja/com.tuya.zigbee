'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MoesClimateMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MoesClimateMonitorDriver initialized');
  }
}

module.exports = MoesClimateMonitorDriver;
