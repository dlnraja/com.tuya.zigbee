const Homey = require('homey');

class Switches-TS0007Driver extends Homey.Driver {
  async onInit() {
    this.log('Switches-TS0007 driver initialized');
  }
}

module.exports = Switches-TS0007Driver;