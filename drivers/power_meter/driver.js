'use strict';

const Homey = require('homey');

class PowerMeterDriver extends Homey.Driver {
  async onInit() {
    this.log('Power Meter Driver initialized');
  }
}

module.exports = PowerMeterDriver;
