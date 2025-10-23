'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoUsbOutletDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoUsbOutletDriver initialized');
  }
}

module.exports = AvattoUsbOutletDriver;
