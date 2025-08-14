'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class sensor_ts0202Driver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = sensor_ts0202Driver;