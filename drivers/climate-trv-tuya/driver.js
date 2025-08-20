'use strict';

const { Driver } = require('homey');

class ClimateTrvTuyaDriver extends Driver {
  async onInit() {
    this.log('Climate TRV Tuya driver initialized');
  }
}

module.exports = ClimateTrvTuyaDriver;
