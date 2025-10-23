'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class PhilipsOutdoorSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('PhilipsOutdoorSensorDriver initialized');
  }
}

module.exports = PhilipsOutdoorSensorDriver;
