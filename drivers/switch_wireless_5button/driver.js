'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WirelessSwitch5buttonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('WirelessSwitch5buttonDriver initialized');
  }
}

module.exports = WirelessSwitch5buttonDriver;
