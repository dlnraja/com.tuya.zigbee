'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiHeaterDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-HEATER-DRV] WiFi Heater driver initialized');
  }
}

module.exports = WiFiHeaterDriver;
