'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');
class AqaraMotionSensorDriver extends ZigBeeDriver {
  onInit() { this.log('Aqara Motion Sensor driver initialized'); }
}
module.exports = AqaraMotionSensorDriver;
