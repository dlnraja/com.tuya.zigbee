'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WifiUnifiedSwitchDevice extends TuyaLocalDevice {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_SWITCH] Device ready'); }
}
module.exports = WifiUnifiedSwitchDevice;