'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiAirPurifierDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-AIR-PURIFIER-DRV] Driver initialized');
  }
}

module.exports = WiFiAirPurifierDriver;
