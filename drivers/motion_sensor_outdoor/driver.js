'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class OutdoorSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('OutdoorSensorDriver initialized');
  }
}

module.exports = OutdoorSensorDriver;
