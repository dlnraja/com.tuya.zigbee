'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class BoschThermostatValveDevice extends ZigBeeDevice {

  async onNodeInit() {
    this.log('bosch_thermostat_valve device initialized');
    
    this.registerCapability('target_temperature', 'hvacThermostat');
    this.registerCapability('measure_temperature', 'msTemperatureMeasurement');
    
    await super.onNodeInit();
  }

  
  // Device-specific methods can be added here
}

module.exports = BoschThermostatValveDevice;
