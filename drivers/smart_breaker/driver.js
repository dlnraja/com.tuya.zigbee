'use strict';

const { Driver } = require('homey');

class SmartBreakerDriver extends Driver {
  async onInit() {
    this.log('Smart Breaker driver initialized');
  }
}

module.exports = SmartBreakerDriver;
