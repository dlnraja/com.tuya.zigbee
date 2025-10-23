'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscOsramBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscOsramBulbWhiteDriver initialized');
  }
}

module.exports = LscOsramBulbWhiteDriver;
