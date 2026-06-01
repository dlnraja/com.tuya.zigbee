'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WifiUnifiedPlugDriver extends TuyaLocalDriver {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_PLUG] Initialized'); }
}
module.exports = WifiUnifiedPlugDriver;