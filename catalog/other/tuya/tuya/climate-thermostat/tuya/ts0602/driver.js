'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0602Driver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0602 driver initialized');
  }
}

module.exports = Ts0602Driver;