'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartMotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartMotionSensorDriver initialized');
  }
}

module.exports = ZemismartMotionSensorDriver;
