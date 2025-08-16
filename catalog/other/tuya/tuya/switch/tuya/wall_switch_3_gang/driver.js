#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDriver } = require('homey-zigbeedriver');

class WallSwitch3GangDriver extends ZigBeeDriver {
  async onNodeInit({ zclNode }) {
    this.log('wall_switch_3_gang driver initialized');
  }
}

module.exports = WallSwitch3GangDriver;