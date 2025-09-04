const Homey = require('homey');

class Lights-TS0601_dimmerDriver extends Homey.Driver {
  async onInit() {
    this.log('Lights-TS0601_dimmer driver initialized');
  }
}

module.exports = Lights-TS0601_dimmerDriver;