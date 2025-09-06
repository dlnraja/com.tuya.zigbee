"use strict";
const Homey = require('homey');
class tuya_ts0201_temperature_Device extends Homey.Device {
  async onInit() { this.log('tuya/ts0201_temperature device initialized'); }
}
module.exports = tuya_ts0201_temperature_Device;
