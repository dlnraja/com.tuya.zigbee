#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('🚀 Tuya Zigbee driver init');
  }
}

module.exports = TuyaZigbeeDriver;
