#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class cover_ikeaDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique de l'appareil
  }
}

module.exports = cover_ikeaDevice;