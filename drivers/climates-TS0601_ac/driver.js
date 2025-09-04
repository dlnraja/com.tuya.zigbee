const Homey = require('homey');

class Climates-TS0601_acDriver extends Homey.Driver {
  async onInit() {
    this.log('Climates-TS0601_ac driver initialized');
  }
}

module.exports = Climates-TS0601_acDriver;