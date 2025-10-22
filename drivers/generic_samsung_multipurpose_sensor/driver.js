'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericSamsungMultipurposeSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('GenericSamsungMultipurposeSensorDriver initialized');
  }
}

module.exports = GenericSamsungMultipurposeSensorDriver;
