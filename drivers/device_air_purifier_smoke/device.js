'use strict';
// P3389 lazy device class (P3389: body runs on first use; see lib/utils/LazyDeviceClass.js)
require('../../lib/utils/LazyDeviceClass').lazyDeviceClass(module, () => {
const { attachTamperListener } = require('../../lib/devices/DoorWindowContactHelper');

const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

class SmokeSensorHybridDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // v5.12.59 (P92.126): tamper bit was never fed on this hybrid
    try { attachTamperListener(this, zclNode); } catch (e) { this.log('[TAMPER] [WARN] ' + e.message); }
  }

  handleTuyaDataReport(data) {
     this.log('Smoke DP:', data.dp, data.value);
  }
}

module.exports = SmokeSensorHybridDevice;
return module.exports;
});
