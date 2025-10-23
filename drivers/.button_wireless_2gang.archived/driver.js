'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LonsonhoWirelessButton2gangDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LonsonhoWirelessButton2gangDriver initialized');
  }
}

module.exports = LonsonhoWirelessButton2gangDriver;
