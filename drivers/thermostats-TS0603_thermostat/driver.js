const Homey = require('homey');

class Thermostats-TS0603_thermostatDriver extends Homey.Driver {
  async onInit() {
    this.log('Thermostats-TS0603_thermostat driver initialized');
  }
}

module.exports = Thermostats-TS0603_thermostatDriver;