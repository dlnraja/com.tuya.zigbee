'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscSonoffLedStripDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscSonoffLedStripDriver initialized');
  }
}

module.exports = LscSonoffLedStripDriver;
