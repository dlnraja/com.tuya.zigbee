'use strict';

const { Driver } = require('homey');

class PoolPumpDriver extends Driver {
  async onInit() {
    this.log('Pool Pump driver initialized');
  }
}

module.exports = PoolPumpDriver;
