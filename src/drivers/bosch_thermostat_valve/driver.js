'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BoschThermostatValveDriver extends ZigBeeDriver {

  onInit() {
    this.log('bosch_thermostat_valve driver initialized');
    super.onInit();
  }

}

module.exports = BoschThermostatValveDriver;
