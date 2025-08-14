'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class switch_ts0002Driver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = switch_ts0002Driver;