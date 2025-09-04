const Homey = require('homey');

class Switches-TS0005Driver extends Homey.Driver {
  async onInit() {
    this.log('Switches-TS0005 driver initialized');
  }
}

module.exports = Switches-TS0005Driver;