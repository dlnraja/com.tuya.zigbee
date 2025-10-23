'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscOsramBulbTunableWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscOsramBulbTunableWhiteDriver initialized');
  }
}

module.exports = LscOsramBulbTunableWhiteDriver;
