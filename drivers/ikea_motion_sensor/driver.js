'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class IkeaMotionSensorDriver extends ZigBeeDriver {
  onInit() { this.log('IKEA Motion Sensor driver initialized'); }
}
module.exports = IkeaMotionSensorDriver;
