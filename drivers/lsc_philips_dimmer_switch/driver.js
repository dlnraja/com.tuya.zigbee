'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscPhilipsDimmerSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscPhilipsDimmerSwitchDriver initialized');
  }
}

module.exports = LscPhilipsDimmerSwitchDriver;
