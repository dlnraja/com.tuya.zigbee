'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LonsonhoSonoffButtonWirelessDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LonsonhoSonoffButtonWirelessDriver initialized');
  }
}

module.exports = LonsonhoSonoffButtonWirelessDriver;
