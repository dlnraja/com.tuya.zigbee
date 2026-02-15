'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');
class WiFiGenericDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-GENERIC-DRV] Generic WiFi driver initialized');
  }
}
module.exports = WiFiGenericDriver;
