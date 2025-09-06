'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaTempSensorDriver extends ZigBeeDriver {
  onInit() {
    this.log('Tuya TS0201 Temperature Driver has been initialized');
  }
}

module.exports = TuyaTempSensorDriver;
