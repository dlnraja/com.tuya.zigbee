#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class ZigbeeDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('zigbee driver initialized');
  }
}

module.exports = ZigbeeDriver;