'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ThermostatTuyaDpDriver extends ZigBeeDriver {

  async onInit() {
    this.log('ThermostatTuyaDpDriver initialized');
  }
}

module.exports = ThermostatTuyaDpDriver;
