const Homey = require('homey');

class Plugs-TS011JDriver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS011J driver initialized');
  }
}

module.exports = Plugs-TS011JDriver;