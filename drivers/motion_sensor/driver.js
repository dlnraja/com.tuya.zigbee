'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PhilipsMotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PhilipsMotionSensorDriver initialized');
  }
}

module.exports = PhilipsMotionSensorDriver;
