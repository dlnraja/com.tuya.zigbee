const Homey = require('homey');

class Tuya-Cover-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya-Cover-Universal driver initialized');
  }
}

module.exports = Tuya-Cover-UniversalDriver;