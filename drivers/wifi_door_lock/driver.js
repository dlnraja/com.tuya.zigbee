'use strict';

const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiDoorLockDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-DOOR-LOCK-DRV] Driver initialized');
  }
}

module.exports = WiFiDoorLockDriver;
