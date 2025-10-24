'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbOutletDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutletDriver initialized');
  }
}

module.exports = UsbOutletDriver;
