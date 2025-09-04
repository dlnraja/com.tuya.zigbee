const Homey = require('homey');

class SwitchDriver extends Homey.Driver {
  async onInit() {
    this.log('Switch driver initialized');
  }
}

module.exports = SwitchDriver;