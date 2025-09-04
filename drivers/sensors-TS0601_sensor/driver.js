const Homey = require('homey');

class Sensors-TS0601_sensorDriver extends Homey.Driver {
  async onInit() {
    this.log('Sensors-TS0601_sensor driver initialized');
  }
}

module.exports = Sensors-TS0601_sensorDriver;