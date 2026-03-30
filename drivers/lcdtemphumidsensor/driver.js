'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LCDTempHumidSensorDriver extends ZigBeeDriver {
  async onInit() {
    this.log('LCD Temp Humid Sensor driver initialized');
  }
}

module.exports = LCDTempHumidSensorDriver;
