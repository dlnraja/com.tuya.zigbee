const Homey = require('homey');

class Zigbee-Tuya-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Zigbee-Tuya-Universal driver initialized');
  }
}

module.exports = Zigbee-Tuya-UniversalDriver;