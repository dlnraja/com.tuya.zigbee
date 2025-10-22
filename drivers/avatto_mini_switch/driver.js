'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoMiniSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoMiniSwitchDriver initialized');
  }
}

module.exports = AvattoMiniSwitchDriver;
