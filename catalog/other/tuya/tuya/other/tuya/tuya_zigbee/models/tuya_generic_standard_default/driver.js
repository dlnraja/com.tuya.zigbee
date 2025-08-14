'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class climate_tuyaDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = climate_tuyaDriver;