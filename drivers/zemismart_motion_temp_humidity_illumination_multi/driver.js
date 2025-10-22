'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartMotionTempHumidityIlluminationMultiDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartMotionTempHumidityIlluminationMultiDriver initialized');
  }
}

module.exports = ZemismartMotionTempHumidityIlluminationMultiDriver;
