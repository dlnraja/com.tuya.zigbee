'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class models_aqara_garden_709_light_standardDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = models_aqara_garden_709_light_standardDriver;