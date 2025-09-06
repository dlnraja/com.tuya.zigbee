'use strict';
const Homey = require('homey');
class ikea_tradfri_bulb_Driver extends Homey.Driver {
  async onInit() { this.log('ikea/tradfri_bulb driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = ikea_tradfri_bulb_Driver;
