'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscPhilipsBulbColorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscPhilipsBulbColorDriver initialized');
  }
}

module.exports = LscPhilipsBulbColorDriver;
