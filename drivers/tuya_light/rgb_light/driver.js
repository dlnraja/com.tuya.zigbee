const Homey = require('homey');
const TuyaZigbeeDriver = require('../../../lib/TuyaZigbeeDriver');

class RGBLightDriver extends TuyaZigbeeDriver {
  async onInit() {
    this.log('RGBLightDriver has been initialized');
  }
}

module.exports = RGBLightDriver;
