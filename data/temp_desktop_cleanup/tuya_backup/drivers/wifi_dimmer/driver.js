'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiDimmerDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-DIMMER-DRV] Driver initialized');
  }
}

module.exports = WiFiDimmerDriver;
