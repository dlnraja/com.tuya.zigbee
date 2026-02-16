'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiWaterValveDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-WATER-VALVE-DRV] Driver initialized');
  }
}

module.exports = WiFiWaterValveDriver;
