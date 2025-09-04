const Homey = require('homey');

class Switches-TS0003Driver extends Homey.Driver {
  async onInit() {
    this.log('Switches-TS0003 driver initialized');
  }
}

module.exports = Switches-TS0003Driver;