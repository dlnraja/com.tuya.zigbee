'use strict';
const Homey = require('homey');
class aqara_motion_sensor_Driver extends Homey.Driver {
  async onInit() { this.log('drivers/aqara_motion_sensor driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = aqara_motion_sensor_Driver;
