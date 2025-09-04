const Homey = require('homey');

class Tuya-Remote-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya-Remote-Universal driver initialized');
  }
}

module.exports = Tuya-Remote-UniversalDriver;