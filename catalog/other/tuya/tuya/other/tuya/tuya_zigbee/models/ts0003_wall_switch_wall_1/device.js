'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class ts0003_wall_switch_wall_3gang_no_neutralDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique de l'appareil
  }
}

module.exports = ts0003_wall_switch_wall_3gang_no_neutralDevice;