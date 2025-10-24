'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmokeTempHumidSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmokeTempHumidSensorDriver initialized');
  }
}

module.exports = SmokeTempHumidSensorDriver;
