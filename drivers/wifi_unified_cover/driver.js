'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WifiUnifiedCoverDriver extends TuyaLocalDriver {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_COVER] Initialized'); }
}
module.exports = WifiUnifiedCoverDriver;