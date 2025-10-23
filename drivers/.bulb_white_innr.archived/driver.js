'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscInnrBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscInnrBulbWhiteDriver initialized');
  }
}

module.exports = LscInnrBulbWhiteDriver;
