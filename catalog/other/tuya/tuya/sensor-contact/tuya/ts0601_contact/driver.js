#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class Ts0601ContactDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('ts0601_contact driver initialized');
  }
}

module.exports = Ts0601ContactDriver;