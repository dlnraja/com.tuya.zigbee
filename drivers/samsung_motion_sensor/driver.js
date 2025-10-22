'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SamsungMotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SamsungMotionSensorDriver initialized');
  }
}

module.exports = SamsungMotionSensorDriver;
