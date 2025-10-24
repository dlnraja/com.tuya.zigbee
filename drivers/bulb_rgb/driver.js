'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class SmartBulbRgbDriver extends ZigBeeDriver {

  async onInit() {
    this.log('SmartBulbRgbDriver initialized');
  }
}

module.exports = SmartBulbRgbDriver;
