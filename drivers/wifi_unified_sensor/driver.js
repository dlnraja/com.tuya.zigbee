'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WifiUnifiedSensorDriver extends TuyaLocalDriver {
  async onInit() { await super.onInit(); this.log('[WIFI_UNIFIED_SENSOR] Initialized'); }
}
module.exports = WifiUnifiedSensorDriver;