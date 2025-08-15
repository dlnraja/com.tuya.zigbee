'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../lib/zb-verbose');

class GenericDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('🚀 Generic device init');
    attachZBVerbose(this, {
      dumpOnInit: true,
      readBasicAttrs: true,
      subscribeReports: false,
      hookCapabilities: true
    });
  }
}

module.exports = GenericDevice;
