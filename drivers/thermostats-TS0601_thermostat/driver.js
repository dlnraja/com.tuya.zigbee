const Homey = require('homey');

class Thermostats-TS0601_thermostatDriver extends Homey.Driver {
  async onInit() {
    this.log('Thermostats-TS0601_thermostat driver initialized');
  }
}

module.exports = Thermostats-TS0601_thermostatDriver;