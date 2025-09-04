const Homey = require('homey');

class Lights-TS0501BDriver extends Homey.Driver {
  async onInit() {
    this.log('Lights-TS0501B driver initialized');
  }
}

module.exports = Lights-TS0501BDriver;