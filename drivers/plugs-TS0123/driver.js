const Homey = require('homey');

class Plugs-TS0123Driver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS0123 driver initialized');
  }
}

module.exports = Plugs-TS0123Driver;