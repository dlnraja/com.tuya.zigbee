'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiPlugDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-PLUG-DRV] Driver initialized');
  }
}

module.exports = WiFiPlugDriver;
