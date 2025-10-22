'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class AvattoSmartBulbRgbDriver extends ZigBeeDriver {

  async onInit() {
    this.log('AvattoSmartBulbRgbDriver initialized');
  }
}

module.exports = AvattoSmartBulbRgbDriver;
