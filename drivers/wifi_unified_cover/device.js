'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WifiUnifiedCoverDevice extends TuyaLocalDevice {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_COVER] Device ready'); }
}
module.exports = WifiUnifiedCoverDevice;