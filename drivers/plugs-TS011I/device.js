const Homey = require('homey');

class Plugs-TS011IDriver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS011I driver initialized');
  }
}

module.exports = Plugs-TS011IDriver;