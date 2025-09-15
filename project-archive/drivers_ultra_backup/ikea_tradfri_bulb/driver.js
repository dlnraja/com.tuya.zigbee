'use strict';
const Homey = require('homey');
class ikea_tradfri_bulb_Driver extends Homey.Driver {
  async onInit() { this.log('drivers/ikea_tradfri_bulb driver initialized'); }
  async onPairListDevices(data, callback) {
    // Enhanced discovery with filtering
    this.discoveryFilter = (device) => {
      return device.manufacturerName && device.modelId;
    };
    
    return super.onPairListDevices() { return []; }
}
module.exports = ikea_tradfri_bulb_Driver;
