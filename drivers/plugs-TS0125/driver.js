const Homey = require('homey');

class Plugs-TS0125Driver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS0125 driver initialized');
  }
}

module.exports = Plugs-TS0125Driver;