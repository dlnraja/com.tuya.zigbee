'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartMotionSensorPirAcDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartMotionSensorPirAcDriver initialized');
  }
}

module.exports = ZemismartMotionSensorPirAcDriver;
