const Homey = require('homey');

class Fan-Tuya-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Fan-Tuya-Universal driver initialized');
  }
}

module.exports = Fan-Tuya-UniversalDriver;