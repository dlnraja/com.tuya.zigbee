const Homey = require('homey');

class Tuya-Sensor-UniversalDriver extends Homey.Driver {
  async onInit() {
    this.log('Tuya-Sensor-Universal driver initialized');
  }
}

module.exports = Tuya-Sensor-UniversalDriver;