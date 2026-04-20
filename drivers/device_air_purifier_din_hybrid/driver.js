'use strict';
const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericAirPurifierDriver extends ZigBeeDriver {
  onInit() {
    super.onInit();
  }
}

module.exports = GenericAirPurifierDriver;
