'use strict';

const { Driver } = require('homey');

class UsbDongleTripleDriver extends Driver {
  async onInit() {
    this.log('USB Dongle Triple driver initialized');
  }
}

module.exports = UsbDongleTripleDriver;
