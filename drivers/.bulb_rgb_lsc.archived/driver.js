'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscBulbRgbDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscBulbRgbDriver initialized');
  }
}

module.exports = LscBulbRgbDriver;
