const Homey = require('homey');

class TuyaDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya driver initialized');
  }

module.exports = TuyaDriver;