'use strict';

const { Driver } = require('homey');

class FanControllerDriver extends Driver {
  async onInit() {
    this.log('Fan Controller driver initialized');
  }
}

module.exports = FanControllerDriver;
