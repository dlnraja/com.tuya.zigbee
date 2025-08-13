'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class climate_ts0601Driver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = climate_ts0601Driver;