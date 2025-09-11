"use strict";
const Homey = require('homey');
class ikea_tradfri_bulb_Device extends BaseZigbeeDevice.Device {
  async onInit() { this.log('drivers/ikea_tradfri_bulb device initialized'); }
}
module.exports = ikea_tradfri_bulb_Device;
