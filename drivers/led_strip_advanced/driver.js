'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoLedStripAdvancedDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoLedStripAdvancedDriver initialized');
  }
}

module.exports = AvattoLedStripAdvancedDriver;
