'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LedStripAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LedStripAdvancedDriver initialized');
  }
}

module.exports = LedStripAdvancedDriver;
