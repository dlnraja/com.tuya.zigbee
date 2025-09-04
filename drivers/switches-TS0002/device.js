const Homey = require('homey');

class Switches-TS0002Driver extends Homey.Driver {
  async onInit() {
    this.log('Switches-TS0002 driver initialized');
  }
}

module.exports = Switches-TS0002Driver;