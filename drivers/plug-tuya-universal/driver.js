'use strict';

const { Driver } = require('homey');

class PlugTuyaUniversalDriver extends Driver {
  async onInit() {
    this.log('Plug Tuya Universal driver initialized');
  }
}

module.exports = PlugTuyaUniversalDriver;
