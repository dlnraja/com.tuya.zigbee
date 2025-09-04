const Homey = require('homey');

class Plugs-TS011GDriver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS011G driver initialized');
  }
}

module.exports = Plugs-TS011GDriver;