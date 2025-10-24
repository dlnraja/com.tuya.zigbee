'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWirelessSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWirelessSwitchDriver initialized');
  }
}

module.exports = AvattoWirelessSwitchDriver;
