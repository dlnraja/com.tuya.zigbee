const Homey = require('homey');

class Sensors-TS0601_smokeDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0601_smoke driver initialized');
  }
}

module.exports = Sensors-TS0601_smokeDriver;