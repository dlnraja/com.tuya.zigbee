'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartRadarMotionSensorMmwaveDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartRadarMotionSensorMmwaveDriver initialized');
  }
}

module.exports = ZemismartRadarMotionSensorMmwaveDriver;
