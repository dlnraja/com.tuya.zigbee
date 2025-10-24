'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MotionSensorMmwaveBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('MotionSensorMmwaveBasicDriver initialized');
  }
}

module.exports = MotionSensorMmwaveBasicDriver;
