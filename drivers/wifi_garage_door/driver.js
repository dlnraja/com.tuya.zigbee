'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiGarageDoorDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-GARAGE-DOOR-DRV] Driver initialized');
  }
}

module.exports = WiFiGarageDoorDriver;
