'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraClimateSensorDriver extends ZigBeeDriver {
  onInit() {
    this.log('Aqara Climate Sensor driver initialized');
  }
}

module.exports = AqaraClimateSensorDriver;
