'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WifiUnifiedLightDriver extends TuyaLocalDriver {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_LIGHT] Initialized'); }
}
module.exports = WifiUnifiedLightDriver;