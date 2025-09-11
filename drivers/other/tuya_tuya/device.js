const Homey = require('homey');

class TuyaDriver extends BaseZigbeeDevice.Driver {
  async onInit() {
    this.log('Tuya driver initialized');
  }

module.exports = TuyaDriver;