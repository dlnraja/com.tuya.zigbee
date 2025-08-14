'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class models_aqara_padlock_460_lock_standardDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = models_aqara_padlock_460_lock_standardDriver;