'use strict';
const Homey = require('homey');
class bosch_thermostat_valve_Driver extends Homey.Driver {
  async onInit() { this.log('drivers/bosch_thermostat_valve driver initialized'); }
  async onPairListDevices() { return []; }
}
module.exports = bosch_thermostat_valve_Driver;
