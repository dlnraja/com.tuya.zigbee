'use strict';

const { Driver } = require('homey');

class PowerMeterDriver extends Driver {
  async onInit() {
    this.log('Power Meter driver initialized');
  }
}

module.exports = PowerMeterDriver;
