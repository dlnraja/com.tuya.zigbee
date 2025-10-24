'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartTempHumidSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartTempHumidSensorAdvancedDriver initialized');
  }
}

module.exports = ZemismartTempHumidSensorAdvancedDriver;
