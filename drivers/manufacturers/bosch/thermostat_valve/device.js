"use strict";
const Homey = require('homey');
class bosch_thermostat_valve_Device extends Homey.Device {
  async onInit() { this.log('bosch/thermostat_valve device initialized'); }
}
module.exports = bosch_thermostat_valve_Device;
