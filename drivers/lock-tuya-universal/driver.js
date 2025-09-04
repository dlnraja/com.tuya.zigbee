const Homey = require('homey');

class Lock-Tuya-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Lock-Tuya-Universal driver initialized');
  }
}

module.exports = Lock-Tuya-UniversalDriver;