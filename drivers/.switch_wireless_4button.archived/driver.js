'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWirelessSwitch4buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWirelessSwitch4buttonDriver initialized');
  }
}

module.exports = AvattoWirelessSwitch4buttonDriver;
