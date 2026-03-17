'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyatecTempHumidSensorDriver extends ZigBeeDriver {
  async onInit() {
    this.log('Tuyatec Temp Humid Sensor driver initialized');
  }
}

module.exports = TuyatecTempHumidSensorDriver;
