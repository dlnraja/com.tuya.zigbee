const Homey = require('homey');

class Sensors-TS0601_waterDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0601_water driver initialized');
  }
}

module.exports = Sensors-TS0601_waterDriver;