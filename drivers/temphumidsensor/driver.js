'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TemphumidsensorDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('temphumidsensor driver initialized');
  }
}

module.exports = TemphumidsensorDriver;