const Homey = require('homey');

class LightDriver extends Homey.Driver {
  async onInit() {
    this.log('Light driver initialized');
  }
}

module.exports = LightDriver;