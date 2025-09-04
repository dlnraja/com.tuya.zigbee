const Homey = require('homey');

class Switches-TS0008Driver extends Homey.Driver {
  async onInit() {
    this.log('Switches-TS0008 driver initialized');
  }
}

module.exports = Switches-TS0008Driver;