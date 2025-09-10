#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0205Driver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0205 driver initialized');
  }
}

module.exports = Ts0205Driver;