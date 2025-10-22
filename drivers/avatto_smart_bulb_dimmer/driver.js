'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartBulbDimmerDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartBulbDimmerDriver initialized');
  }
}

module.exports = AvattoSmartBulbDimmerDriver;
