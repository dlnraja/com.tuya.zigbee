#!/usr/bin/env node
'use strict';

'use strict';

const attachZBVerbose = require('../../..//lib/zb-verbose');

const ZigbeeDevice = require('homey-meshdriver').ZigbeeDevice;

class GenericZigbeeSwitch1GangDevice extends ZigbeeDevice {
  async onMeshInit() {
    // Register capabilities
    await this.registerCapability('onoff', 'genOnOff');
  }
}

module.exports = GenericZigbeeSwitch1GangDevice;
