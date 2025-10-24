'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscOsramBulbRgbwDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscOsramBulbRgbwDriver initialized');
  }
}

module.exports = LscOsramBulbRgbwDriver;
