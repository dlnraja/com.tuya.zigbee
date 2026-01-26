'use strict';

const { Driver } = require('homey');

class DinRailMeterDriver extends Driver {
  async onInit() {
    this.log('Din Rail Meter driver initialized');
  }
}

module.exports = DinRailMeterDriver;
