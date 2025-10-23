'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZemismartRadarMotionSensorAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ZemismartRadarMotionSensorAdvancedDriver initialized');
  }
}

module.exports = ZemismartRadarMotionSensorAdvancedDriver;
