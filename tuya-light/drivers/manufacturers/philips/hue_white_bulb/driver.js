'use strict';
const Homey = require('homey');
class philips_hue_white_bulb_Driver extends Homey.Driver {
  async onInit() { this.log('philips/hue_white_bulb driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = philips_hue_white_bulb_Driver;
