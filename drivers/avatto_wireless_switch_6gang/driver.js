'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWirelessSwitch6gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWirelessSwitch6gangDriver initialized');
  }
}

module.exports = AvattoWirelessSwitch6gangDriver;
