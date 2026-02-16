'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSwitch4gangDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-SWITCH-4GANG-DRV] Driver initialized');
  }
}

module.exports = WiFiSwitch4gangDriver;
