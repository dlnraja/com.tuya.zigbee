'use strict';
const Homey = require('homey');
class aqara_motion_sensor_Driver extends Homey.Driver {
  async onInit() { this.log('drivers/aqara_motion_sensor driver initialized'); }
  async onPairListDevices(data, callback) {
    // Enhanced discovery with filtering
    this.discoveryFilter = (device) => {
      return device.manufacturerName && device.modelId;
    };
    
    return super.onPairListDevices() { return []; }
}
module.exports = aqara_motion_sensor_Driver;
