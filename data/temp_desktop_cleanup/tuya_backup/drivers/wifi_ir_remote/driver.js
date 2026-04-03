'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiIrRemoteDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-IR-REMOTE-DRV] Driver initialized');
  }
}

module.exports = WiFiIrRemoteDriver;
