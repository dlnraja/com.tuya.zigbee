#!/usr/bin/env node
'use strict';

'use strict';

const { ZigBeeLightDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../../lib/zb-verbose');

class TS130FLightDevice extends ZigBeeLightDevice {
  async onNodeInit({ zclNode }) {
    this.log('🚀 TS130F Light device init');
    attachZBVerbose(this, {
      dumpOnInit: true,
      readBasicAttrs: true,
      subscribeReports: true,
      hookCapabilities: true
    });
  }
}

module.exports = TS130FLightDevice;
