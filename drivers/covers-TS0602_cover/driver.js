const Homey = require('homey');

class Covers-TS0602_coverDriver extends Homey.Driver {
  async onInit() {
    this.log('Covers-TS0602_cover driver initialized');
  }
}

module.exports = Covers-TS0602_coverDriver;