'use strict';

const { ZigBeeDevice } = require('homey-zigbeedriver');
const attachZBVerbose = require('../../lib/zb-verbose');

class TuyaZigbeeDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    this.log('🚀 Tuya Zigbee device init');
    attachZBVerbose(this, {
      dumpOnInit: true,
      readBasicAttrs: true,
      subscribeReports: false,
      hookCapabilities: true
    });
  }
}

module.exports = TuyaZigbeeDevice;
