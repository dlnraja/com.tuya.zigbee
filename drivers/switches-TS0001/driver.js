const Homey = require('homey');

class Switches-TS0001Driver extends Homey.Driver {
  async onInit() {
    this.log('Switches-TS0001 driver initialized');
  }
}

module.exports = Switches-TS0001Driver;