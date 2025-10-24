'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class LonsonhoSamsungButtonDriver extends ZigBeeDriver {

  async onInit() {
    this.log('LonsonhoSamsungButtonDriver initialized');
  }
}

module.exports = LonsonhoSamsungButtonDriver;
