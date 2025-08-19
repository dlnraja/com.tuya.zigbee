#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0208Driver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0208 driver initialized');
  }
}

module.exports = Ts0208Driver;