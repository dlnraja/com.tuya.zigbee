#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0204Driver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0204 driver initialized');
  }
}

module.exports = Ts0204Driver;