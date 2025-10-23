'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SonoffMotionSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SonoffMotionSensorDriver initialized');
  }
}

module.exports = SonoffMotionSensorDriver;
