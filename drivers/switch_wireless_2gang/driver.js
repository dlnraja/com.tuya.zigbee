'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWirelessSwitch2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWirelessSwitch2gangDriver initialized');
  }
}

module.exports = AvattoWirelessSwitch2gangDriver;
