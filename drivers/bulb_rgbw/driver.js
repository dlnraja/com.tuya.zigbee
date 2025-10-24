'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class BulbRgbwDriver extends ZigBeeDriver {

  async onInit() {
    this.log('BulbRgbwDriver initialized');
  }
}

module.exports = BulbRgbwDriver;
