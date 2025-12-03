'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Thermostat4chDriver extends ZigBeeDriver {

  async onInit() {
    this.log('Thermostat4chDriver initialized');
  }

}

module.exports = Thermostat4chDriver;
