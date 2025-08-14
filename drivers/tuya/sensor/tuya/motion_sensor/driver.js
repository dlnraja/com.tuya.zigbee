'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class MotionSensorDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('motion_sensor driver initialized');
  }
}

module.exports = MotionSensorDriver;