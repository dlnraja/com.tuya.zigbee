'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class light_ts0502aDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = light_ts0502aDriver;