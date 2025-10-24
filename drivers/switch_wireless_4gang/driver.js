'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWirelessSwitch4gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWirelessSwitch4gangDriver initialized');
  }
}

module.exports = AvattoWirelessSwitch4gangDriver;
