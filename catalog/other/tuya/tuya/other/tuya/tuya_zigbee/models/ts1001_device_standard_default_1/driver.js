'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class siren_ts1001Driver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = siren_ts1001Driver;