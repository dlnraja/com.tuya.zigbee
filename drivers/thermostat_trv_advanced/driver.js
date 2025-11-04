'use strict';

const { Driver } = require('homey');

class ThermostatTrvAdvancedDriver extends Driver {
  
  async onInit() {
    this.log('Smart TRV Advanced driver has been initialized');
  }
}

module.exports = ThermostatTrvAdvancedDriver;
