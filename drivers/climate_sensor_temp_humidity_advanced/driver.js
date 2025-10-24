'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TempHumidSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('TempHumidSensorAdvancedDriver initialized');
  }
}

module.exports = TempHumidSensorAdvancedDriver;
