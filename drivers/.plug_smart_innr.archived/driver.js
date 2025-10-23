'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoInnrSmartPlugDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoInnrSmartPlugDriver initialized');
  }
}

module.exports = AvattoInnrSmartPlugDriver;
