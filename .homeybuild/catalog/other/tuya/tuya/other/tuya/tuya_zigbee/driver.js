#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class TuyaZigbeeDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('tuya_zigbee driver initialized');
  }
}

module.exports = TuyaZigbeeDriver;