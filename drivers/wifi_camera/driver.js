'use strict';
const TuyaLocalDriver = require('../../lib/tuya-local/TuyaLocalDriver');

class WiFiCameraDriver extends TuyaLocalDriver {
  async onInit() {
    await super.onInit();
    this.log('[WIFI-CAM-DRV] Driver initialized');
  }
}

module.exports = WiFiCameraDriver;
