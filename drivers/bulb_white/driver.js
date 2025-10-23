'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartBulbWhiteDriver initialized');
  }
}

module.exports = AvattoSmartBulbWhiteDriver;
