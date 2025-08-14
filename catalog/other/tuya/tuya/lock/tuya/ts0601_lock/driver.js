'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601LockDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0601_lock driver initialized');
  }
}

module.exports = Ts0601LockDriver;