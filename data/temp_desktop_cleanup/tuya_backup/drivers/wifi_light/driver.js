'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiLightDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-LIGHT-DRV] Driver initialized');
  }
}

module.exports = WiFiLightDriver;
