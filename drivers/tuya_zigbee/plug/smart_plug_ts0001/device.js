#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../../lib/zb-verbose');

class SmartPlugTS0001Device extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('🚀 Smart Plug TS0001 device init');
    attachZBVerbose(this, {
      dumpOnInit: true,
      readBasicAttrs: true,
      subscribeReports: true,
      hookCapabilities: true
    });
  }
}

module.exports = SmartPlugTS0001Device;
