#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class sensor_ts0204Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique de l'appareil
  }
}

module.exports = sensor_ts0204Device;