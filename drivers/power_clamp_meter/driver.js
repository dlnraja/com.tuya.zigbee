'use strict';

const { Driver } = require('homey');

class PowerClampMeterDriver extends Driver {
  async onInit() {
    this.log('Power Clamp Meter driver initialized');
  }
}

module.exports = PowerClampMeterDriver;
