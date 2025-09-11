const Homey = require('homey');
const TuyaZigbeeDriver = require('../../lib/TuyaZigbeeDriver');

class ThermostatDriver extends TuyaZigbeeDriver {
  async onInit() {
    this.log('ThermostatDriver has been initialized');
  }

module.exports = ThermostatDriver;
