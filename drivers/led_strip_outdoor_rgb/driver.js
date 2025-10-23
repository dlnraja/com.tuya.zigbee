'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscLedStripOutdoorColorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscLedStripOutdoorColorDriver initialized');
  }
}

module.exports = LscLedStripOutdoorColorDriver;
