'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class GenericMultipurposeSensorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('GenericMultipurposeSensorDriver initialized');
  }
}

module.exports = GenericMultipurposeSensorDriver;
