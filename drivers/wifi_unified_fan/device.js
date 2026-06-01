'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WifiUnifiedFanDevice extends TuyaLocalDevice {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_FAN] Device ready'); }
}
module.exports = WifiUnifiedFanDevice;