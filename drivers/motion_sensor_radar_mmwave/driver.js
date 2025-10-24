'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadarMotionSensorMmwaveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadarMotionSensorMmwaveDriver initialized');
  }
}

module.exports = RadarMotionSensorMmwaveDriver;
