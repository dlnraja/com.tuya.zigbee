const Homey = require('homey');

class Lights-TS0601_switchDriver extends Homey.Driver {
  async onInit() {
    this.log('Lights-TS0601_switch driver initialized');
  }
}

module.exports = Lights-TS0601_switchDriver;