"use strict";
const Homey = require('homey');
class aqara_motion_sensor_Device extends BaseZigbeeDevice.Device {
  async onInit() { this.log('drivers/aqara_motion_sensor device initialized'); }
}
module.exports = aqara_motion_sensor_Device;
