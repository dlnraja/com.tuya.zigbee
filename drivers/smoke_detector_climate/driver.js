'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartSmokeTempHumidSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartSmokeTempHumidSensorDriver initialized');
  }
}

module.exports = ZemismartSmokeTempHumidSensorDriver;
