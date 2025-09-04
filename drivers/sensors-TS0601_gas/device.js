const Homey = require('homey');

class Sensors-TS0601_gasDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0601_gas driver initialized');
  }
}

module.exports = Sensors-TS0601_gasDriver;