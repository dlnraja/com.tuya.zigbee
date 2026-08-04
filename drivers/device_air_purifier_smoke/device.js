'use strict';
const { attachTamperListener } = require('../../lib/devices/DoorWindowContactHelper');

const { safeParse } = require('../../lib/utils/tuyaUtils.js');
const TuyaSpecificClusterDevice = require('../../lib/tuya/TuyaSpecificClusterDevice');

class SmokeSensorHybridDevice extends TuyaSpecificClusterDevice {
  async onNodeInit({ zclNode }) {
    await super.onNodeInit({ zclNode });
    // v5.12.59 (P92.126): tamper bit was never fed on this hybrid
    try { attachTamperListener(this, zclNode); } catch (e) { this.log('[TAMPER] ⚠️ ' + e.message); }
  }

  handleTuyaDataReport(data) {
     this.log('Smoke DP:', data.dp, data.value);
  }
}

module.exports = SmokeSensorHybridDevice;
