const Homey = require('homey');

class Tuya-Climate-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya-Climate-Universal driver initialized');
  }
}

module.exports = Tuya-Climate-UniversalDriver;