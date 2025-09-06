"use strict";
const Homey = require('homey');
class ikea_tradfri_bulb_Device extends Homey.Device {
  async onInit() { this.log('ikea/tradfri_bulb device initialized'); }
}
module.exports = ikea_tradfri_bulb_Device;
