#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');

class models_aqara_door_305_lock_standardDriver extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    // TODO: Implémenter la logique du driver
  }
}

module.exports = models_aqara_door_305_lock_standardDriver;