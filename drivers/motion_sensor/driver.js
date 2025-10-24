'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MotionSensorDriver initialized');
  }
}

module.exports = MotionSensorDriver;
