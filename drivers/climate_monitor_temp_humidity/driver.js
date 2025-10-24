'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ClimateMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ClimateMonitorDriver initialized');
  }
}

module.exports = ClimateMonitorDriver;
