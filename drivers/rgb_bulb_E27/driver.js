'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class RgbBulbE27Driver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('rgb_bulb_E27 driver initialized');
  }
}

module.exports = RgbBulbE27Driver;