'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoRemoteSwitchDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoRemoteSwitchDriver initialized');
  }
}

module.exports = AvattoRemoteSwitchDriver;
