#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0206Driver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0206 driver initialized');
  }
}

module.exports = Ts0206Driver;