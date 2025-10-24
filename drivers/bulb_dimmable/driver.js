'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartBulbDimmerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartBulbDimmerDriver initialized');
  }
}

module.exports = SmartBulbDimmerDriver;
