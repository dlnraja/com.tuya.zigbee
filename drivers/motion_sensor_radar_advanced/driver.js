'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RadarMotionSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('RadarMotionSensorAdvancedDriver initialized');
  }
}

module.exports = RadarMotionSensorAdvancedDriver;
