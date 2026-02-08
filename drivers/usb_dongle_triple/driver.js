'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbDongleTripleDriver extends ZigBeeDriver {
  async onInit() {
    this.log('USB Dongle Triple Driver initialized');
  }
}

module.exports = UsbDongleTripleDriver;
