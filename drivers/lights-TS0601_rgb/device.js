const Homey = require('homey');

class Lights-TS0601_rgbDriver extends Homey.Driver {
  async onInit() {
    this.log('Lights-TS0601_rgb driver initialized');
  }
}

module.exports = Lights-TS0601_rgbDriver;