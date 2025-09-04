const Homey = require('homey');

class Plugs-TS011HDriver extends Homey.Driver {
  async onInit() {
    this.log('Plugs-TS011H driver initialized');
  }
}

module.exports = Plugs-TS011HDriver;