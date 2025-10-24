'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MotionTempHumidityIlluminationMultiDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MotionTempHumidityIlluminationMultiDriver initialized');
  }
}

module.exports = MotionTempHumidityIlluminationMultiDriver;
