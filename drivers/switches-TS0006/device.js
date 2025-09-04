const Homey = require('homey');

class Switches-TS0006Driver extends Homey.Driver {
  async onInit() {
    this.log('Switches-TS0006 driver initialized');
  }
}

module.exports = Switches-TS0006Driver;