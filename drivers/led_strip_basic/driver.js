'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedStripBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedStripBasicDriver initialized');
  }
}

module.exports = LedStripBasicDriver;
