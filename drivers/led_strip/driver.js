'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedStripDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedStripDriver initialized');
  }
}

module.exports = LedStripDriver;
