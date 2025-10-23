'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscBulbWhiteDriver initialized');
  }
}

module.exports = LscBulbWhiteDriver;
