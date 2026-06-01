'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WifiUnifiedGenericDriver extends TuyaLocalDriver {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_GENERIC] Initialized'); }
}
module.exports = WifiUnifiedGenericDriver;