'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class models_radar_24g_switch_standardDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = models_radar_24g_switch_standardDriver;