"use strict";
const Homey = require('homey');
class philips_hue_white_bulb_Device extends Homey.Device {
  async onInit() { this.log('drivers/philips_hue_white_bulb device initialized'); }
}
module.exports = philips_hue_white_bulb_Device;
