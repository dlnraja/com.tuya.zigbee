'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSwitch3gangDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-SWITCH-3GANG-DRV] Driver initialized');
  }
}

module.exports = WiFiSwitch3gangDriver;
