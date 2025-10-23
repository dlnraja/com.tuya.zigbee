'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoLedStripBasicDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoLedStripBasicDriver initialized');
  }
}

module.exports = AvattoLedStripBasicDriver;
