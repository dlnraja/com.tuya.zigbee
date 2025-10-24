'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscInnrBulbColorDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscInnrBulbColorDriver initialized');
  }
}

module.exports = LscInnrBulbColorDriver;
