'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class models_ikea_chime_70_siren_standardDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = models_ikea_chime_70_siren_standardDriver;