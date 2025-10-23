'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscInnrBulbTunableWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscInnrBulbTunableWhiteDriver initialized');
  }
}

module.exports = LscInnrBulbTunableWhiteDriver;
