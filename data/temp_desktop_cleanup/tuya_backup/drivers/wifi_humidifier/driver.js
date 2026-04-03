'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiHumidifierDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-HUMIDIFIER-DRV] Driver initialized');
  }
}

module.exports = WiFiHumidifierDriver;
