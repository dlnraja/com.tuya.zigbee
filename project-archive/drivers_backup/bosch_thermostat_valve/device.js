"use strict";
const Homey = require('homey');
class bosch_thermostat_valve_Device extends BaseZigbeeDevice.Device {
  async onInit() { this.log('drivers/bosch_thermostat_valve device initialized'); }
}
module.exports = bosch_thermostat_valve_Device;
