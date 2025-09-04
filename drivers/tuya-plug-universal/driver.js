const Homey = require('homey');

class Tuya-Plug-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya-Plug-Universal driver initialized');
  }
}

module.exports = Tuya-Plug-UniversalDriver;