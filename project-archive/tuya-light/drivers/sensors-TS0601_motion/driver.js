const Homey = require('homey');

class Sensors-TS0601_motionDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0601_motion driver initialized');
  }
}

module.exports = Sensors-TS0601_motionDriver;