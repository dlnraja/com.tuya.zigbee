'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoUsbOutletAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoUsbOutletAdvancedDriver initialized');
  }
}

module.exports = AvattoUsbOutletAdvancedDriver;
