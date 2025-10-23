'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoMotionSensorMmwaveBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoMotionSensorMmwaveBasicDriver initialized');
  }
}

module.exports = AvattoMotionSensorMmwaveBasicDriver;
