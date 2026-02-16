'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiSwitch2gangDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-SWITCH-2GANG-DRV] Driver initialized');
  }
}

module.exports = WiFiSwitch2gangDriver;
