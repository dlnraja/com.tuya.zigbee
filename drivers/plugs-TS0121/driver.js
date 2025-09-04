const Homey = require('homey');

class Plugs-TS0121Driver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS0121 driver initialized');
  }
}

module.exports = Plugs-TS0121Driver;