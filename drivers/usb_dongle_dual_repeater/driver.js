'use strict';

const { Driver } = require('homey');

class USBHubDualDriver extends Driver {
  async onInit() {
    this.log('USB Hub Dual Driver initialized');
  }
}

module.exports = USBHubDualDriver;
