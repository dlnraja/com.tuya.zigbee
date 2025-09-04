const Homey = require('homey');

class FanDriver extends Homey.Driver {
  async onInit() {
    this.log('Fan driver initialized');
  }
}

module.exports = FanDriver;