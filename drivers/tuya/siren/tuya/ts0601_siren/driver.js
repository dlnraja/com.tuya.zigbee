'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601SirenDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0601_siren driver initialized');
  }
}

module.exports = Ts0601SirenDriver;