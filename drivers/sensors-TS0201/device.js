const Homey = require('homey');

class Sensors-TS0201Driver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0201 driver initialized');
  }
}

module.exports = Sensors-TS0201Driver;