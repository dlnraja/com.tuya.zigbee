"use strict";
const Homey = require('homey');
class tuya_tuya_sensor_Driver extends Homey.Driver {
  async onInit() { this.log('tuya/tuya_sensor driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = tuya_tuya_sensor_Driver;
