'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class CO2Driver extends ZigBeeDriver {
  onInit() {
    this.log('CO2 Driver initialized');
  }
}
module.exports = CO2Driver;