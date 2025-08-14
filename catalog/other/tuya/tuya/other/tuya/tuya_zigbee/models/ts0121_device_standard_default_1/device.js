'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class plug_ts0121Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique de l'appareil
  }
}

module.exports = plug_ts0121Device;