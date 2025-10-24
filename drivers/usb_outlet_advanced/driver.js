'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class UsbOutletAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('UsbOutletAdvancedDriver initialized');
  }
}

module.exports = UsbOutletAdvancedDriver;
