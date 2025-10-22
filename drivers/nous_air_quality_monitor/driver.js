'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class NousAirQualityMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('NousAirQualityMonitorDriver initialized');
  }
}

module.exports = NousAirQualityMonitorDriver;
