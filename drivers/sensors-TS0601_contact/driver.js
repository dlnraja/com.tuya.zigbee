const Homey = require('homey');

class Sensors-TS0601_contactDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0601_contact driver initialized');
  }
}

module.exports = Sensors-TS0601_contactDriver;