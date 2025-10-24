'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AirQualityMonitorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AirQualityMonitorDriver initialized');
  }
}

module.exports = AirQualityMonitorDriver;
