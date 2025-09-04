const Homey = require('homey');

class Sensors-TS0601_vibrationDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0601_vibration driver initialized');
  }
}

module.exports = Sensors-TS0601_vibrationDriver;