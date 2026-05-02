'use strict';
const { safeMultiply, safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');

class UniversalFallbackDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    this.log('Universal Fallback Device v5.9.12 Ready');
  }

  async onDeleted() {
    await super.onDeleted?.();
  }
}

module.exports = UniversalFallbackDevice;
