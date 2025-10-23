'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoPhilipsSmartPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoPhilipsSmartPlugDriver initialized');
  }
}

module.exports = AvattoPhilipsSmartPlugDriver;
