'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoWirelessSwitch5buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoWirelessSwitch5buttonDriver initialized');
  }
}

module.exports = AvattoWirelessSwitch5buttonDriver;
