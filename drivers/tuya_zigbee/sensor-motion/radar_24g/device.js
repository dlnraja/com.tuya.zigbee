#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../../lib/zb-verbose');

class Radar24GMotionDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('🚀 Radar 24GHz Motion device init');
    attachZBVerbose(this, {
      dumpOnInit: true,
      readBasicAttrs: true,
      subscribeReports: true,
      hookCapabilities: true
    });
  }
}

module.exports = Radar24GMotionDevice;
