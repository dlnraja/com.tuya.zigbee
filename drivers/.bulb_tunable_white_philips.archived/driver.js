'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscPhilipsBulbWhiteAmbianceDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscPhilipsBulbWhiteAmbianceDriver initialized');
  }
}

module.exports = LscPhilipsBulbWhiteAmbianceDriver;
