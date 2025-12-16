'use strict';

const { Driver } = require('homey');

class IrBlasterDriver extends Driver {

  async onInit() {
    this.log('IR Blaster driver initialized');
  }

  async onPairListDevices() {
    // Devices are discovered by Zigbee
    return [];
  }
}

module.exports = IrBlasterDriver;
