'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LscBulbWhiteAmbianceDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LscBulbWhiteAmbianceDriver initialized');
  }
}

module.exports = LscBulbWhiteAmbianceDriver;
