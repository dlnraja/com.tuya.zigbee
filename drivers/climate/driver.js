const Homey = require('homey');

class ClimateDriver extends Homey.Driver {
  async onInit() {
    this.log('Climate driver initialized');
  }
}

module.exports = ClimateDriver;