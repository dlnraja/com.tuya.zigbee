'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscPhilipsBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscPhilipsBulbWhiteDriver initialized');
  }
}

module.exports = LscPhilipsBulbWhiteDriver;
