const Homey = require('homey');

class Plugs-TS0122Driver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS0122 driver initialized');
  }
}

module.exports = Plugs-TS0122Driver;