const Homey = require('homey');

class PlugDriver extends Homey.Driver {
  async onInit() {
    this.log('Plug driver initialized');
  }
}

module.exports = PlugDriver;