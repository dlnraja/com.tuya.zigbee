'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WifiUnifiedGenericDevice extends TuyaLocalDevice {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_GENERIC] Device ready'); }
}
module.exports = WifiUnifiedGenericDevice;