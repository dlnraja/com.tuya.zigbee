'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601CoverDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0601_cover driver initialized');
  }
}

module.exports = Ts0601CoverDriver;