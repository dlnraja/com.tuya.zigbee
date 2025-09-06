"use strict";
const Homey = require('homey');
class aqara_motion_sensor_Device extends Homey.Device {
  async onInit() { this.log('aqara/motion_sensor device initialized'); }
}
module.exports = aqara_motion_sensor_Device;
