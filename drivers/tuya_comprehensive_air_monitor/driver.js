'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaComprehensiveAirMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TuyaComprehensiveAirMonitorDriver initialized');
  }
}

module.exports = TuyaComprehensiveAirMonitorDriver;
