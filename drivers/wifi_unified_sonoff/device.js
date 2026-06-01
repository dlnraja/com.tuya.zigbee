'use strict';
const TuyaLocalDevice = require('../../lib/tuya-local/TuyaLocalDevice');
class WifiUnifiedSonoffDevice extends TuyaLocalDevice {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_SONOFF] Device ready'); }
}
module.exports = WifiUnifiedSonoffDevice;