'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts130fDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts130f driver initialized');
  }
}

module.exports = Ts130fDriver;