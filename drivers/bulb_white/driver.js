'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartBulbWhiteDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartBulbWhiteDriver initialized');
  }
}

module.exports = SmartBulbWhiteDriver;
