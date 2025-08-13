'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class siren_ts004fDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = siren_ts004fDriver;