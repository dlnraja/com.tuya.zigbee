'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class models_ikea_deadbolt_274_lock_standardDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = models_ikea_deadbolt_274_lock_standardDriver;