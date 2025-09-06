"use strict";
const Homey = require('homey');
class tuya_tuya_light_Device extends Homey.Device {
  async onInit() { this.log('tuya/tuya_light device initialized'); }
}
module.exports = tuya_tuya_light_Device;
