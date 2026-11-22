'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaZigbeeDevice = require('../../lib/tuya/TuyaZigbeeDevice');
const { attachTamperListener } = require('../../lib/devices/DoorWindowContactHelper');

class DimmerWallWaterDevice extends TuyaZigbeeDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // v9.0.418 (P92.126): tamper bit was never fed on this hybrid
    try { attachTamperListener(this, zclNode); } catch (e) { this.log('[TAMPER] [WARN] ' + e.message); }
    this.log('Dimmer Wall Water hybrid Ready');
  }
}
module.exports = DimmerWallWaterDevice;
return module.exports;
});
