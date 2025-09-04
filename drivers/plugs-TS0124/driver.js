const Homey = require('homey');

class Plugs-TS0124Driver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS0124 driver initialized');
  }
}

module.exports = Plugs-TS0124Driver;