const Homey = require('homey');

class SensorDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensor driver initialized');
  }
}

module.exports = SensorDriver;