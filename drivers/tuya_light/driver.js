"use strict";
const Homey = require('homey');
class tuya_tuya_light_Driver extends Homey.Driver {
  async onInit() { this.log('tuya/tuya_light driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = tuya_tuya_light_Driver;
