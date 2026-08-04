'use strict';
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const { ZigBeeDevice } = require('homey-zigbeedriver');
const { attachTamperListener } = require('../../lib/devices/DoorWindowContactHelper');

class DimmerWallWaterDevice extends ZigBeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // v5.12.59 (P92.126): tamper bit was never fed on this hybrid
    try { attachTamperListener(this, zclNode); } catch (e) { this.log('[TAMPER] ⚠️ ' + e.message); }
    this.log('Dimmer Wall Water hybrid Ready');
  }
}
module.exports = DimmerWallWaterDevice;
