'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class cover_genericDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique de l'appareil
  }
}

module.exports = cover_genericDevice;