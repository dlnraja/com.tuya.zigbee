const Homey = require('homey');

class Tuya-Light-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya-Light-Universal driver initialized');
  }
}

module.exports = Tuya-Light-UniversalDriver;