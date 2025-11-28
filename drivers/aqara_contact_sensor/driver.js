'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AqaraContactSensorDriver extends ZigBeeDriver {
  onInit() {
    this.log('Aqara Contact Sensor driver initialized');
  }
}

module.exports = AqaraContactSensorDriver;
