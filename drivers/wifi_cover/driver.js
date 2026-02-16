'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiCoverDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-COVER-DRV] Driver initialized');
  }
}

module.exports = WiFiCoverDriver;
